import User from '../models/user';
import Hotel from '../models/hotel';
import Order from '../models/order';
import Stripe from 'stripe';
import queryString from 'query-string';

// Find user form DB
const stripe = Stripe(process.env.STRIPE_SECRET);
// If user don't have stripe_account_id yet, create now
export const createConnectAccount = async (req, res) => {
    const user = await User.findById(req.user._id).exec();
    console.log("USER ===> ", user);
    
    if(!user.stripe_account_id) {
        const account = await stripe.accounts.create({
            type: 'standard'
        });
        console.log("ACCOUNT ===> ", account);
        user.stripe_account_id = account.id;
        user.save();
    }
// Create login link based on account id (for frontend to complete onboarding)
let accountLink = await stripe.accountLinks.create({
    account: user.stripe_account_id,
    refresh_url: process.env.STRIPE_REDIRECT_URL,
    return_url: process.env.STRIPE_REDIRECT_URL,
    type: 'account_onboarding'
});
// prefill any info such as email
accountLink = Object.assign(accountLink, {
    'stripe_user[email]': user.email || undefined,
});

let link = `${accountLink.url}?${queryString.stringify(accountLink)}`;
console.log("LOGIN LINK ", link);
res.send(link);
// Update payment schedule (optional) default is 5 days
};

// const updateDelayDays = async (accountId) => {
//     const account = await stripe.accounts.update(accountId, {
//         settings: {
//             payouts: {
//                 schedule: {
//                     delay_days: 7,
//                 },
//             },
//         },
//     });
//     return account;
// };

export const getAccountStatus = async (req, res) => {
    // console.log("Get Account Status...");
    const user = await User.findById(req.user._id).exec();
    const account = await stripe.accounts.retrieve(user.stripe_account_id);
    // console.log("USER ACCOUNT RETRIEVE: ", account);
    // update delay days
    // const updatedAccount = await updateDelayDays(account.id);
    const updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
            stripe_seller: account,
        },
        { new: true }
    )
    .select('-password')
    .exec();
    res.json(updatedUser);
}

export const getAccountBalance = async (req, res) => {
    const user = await User.findById(req.user._id).exec();
    try {
        const balance = await stripe.balance.retrieve({
            stripeAccount: user.stripe_account_id,
        });
        // console.log("BALANCE ===> ",balance);
        res.json(balance);
    } catch (err) {
        console.log(err);
    }
}

export const payoutSetting = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).exec();
        const loginLink = await stripe.accounts.createLoginLink(
            user.stripe_seller.id,
            {
                redirect_url: process.env.STRIPE_SETTING_REDIRECT_URL,
            }
        );
        // console.log('LOGIN LINK FOR PAYOUT SETTING: ', loginLink);
        res.json(loginLink);
    } catch (err) {
        console.log('STRIPE PAYOUT SETTING ERR', err);
    }
}

export const stripeSessionId = async (req, res) => {

    const { hotelId } = req.body;
    const item = await Hotel.findById(hotelId).populate('postedBy').exec();
    const fee = (item.price * 20) / 100;

    const price = await stripe.prices.create({
        product: 'prod_LY6zBTpYSMAI5l',
        unit_amount: item.price * 100,
        currency: 'inr',
    });

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price: price.id,
                quantity: 1,
            },
        ],
        mode: 'payment',
        payment_intent_data: {
            application_fee_amount: fee * 100,
            transfer_data: {
                destination: item.postedBy.stripe_account_id,
            },
        },
        success_url: `${process.env.STRIPE_SUCCESS_URL}/${item._id}`,
        cancel_url: process.env.STRIPE_CANCEL_URL,
    });

    // console.log(session);

   await User.findByIdAndUpdate(req.user._id, { stripeSession: session}).exec();
   res.send({
       sessionId: session.id,
   });
};

export const stripeSuccess = async (req, res) => {
    try {
        // Get hotel id from req.body
        const { hotelId } = req.body;
        // Find currently logged in User
        const user = await User.findById(req.user._id).exec();
        // Check if user has stripeSession
        if(!user.stripeSession) return;
        // Retrieve stripe session, based on session id we previously save in user DB
        const session = await stripe.checkout.sessions.retrieve(user.stripeSession.id);
        // If session payment status is paid, create order
        if(session.payment_status === 'paid') {
            // Check if order with that session id already exist by querying orders collections
            const orderExist = await Order.findOne({'session.id': session.id}).exec();
            if(orderExist) {
                // If order exist, send success true
                res.json({ success: true });
            } else {
                // Else create new order and send success true
                let newOrder = await new Order({
                    hotel: hotelId,
                    session,
                    orderedBy: user._id
                }).save();
                // Remove user's stripeSession
                await User.findByIdAndUpdate(user._id, {
                    $set: { stripeSession: {}},
                });
                res.json({ success: true });
            }
        }
    } catch (err) {
        console.log('STRIPE SUCCESS ERR', err);
    }
};