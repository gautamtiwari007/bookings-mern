import User from '../models/user';
import jwt from 'jsonwebtoken';

export const register = async (req, res) => {
    try {
        console.log(req.body);
        const { name, email, password } = req.body;
        // Validation
        if(!name) return res.status(400).send('Name is required.');
        if(!email) return res.status(400).send('Email is required.');
        if(!password || password.length < 6) return res.status(400).send('Password is required and should be minimum 6 characters long.');
        
        let userExist = await User.findOne({ email }).exec();
        if(userExist) return res.status(400).send('Email is already taken!');
        // Register
        const user = new User(req.body);
        await user.save();
        console.log('USER CREATED', user);
        return res.json({ ok: true });
    } catch (err) {
        console.log('CREATE USER FAILED',err);
        return res.status(400).send('Error. Try again!');
    }
};

export const login = async (req, res) => {
    try {
        //console.log(req.body);
        const { email, password } = req.body;
        // Check if user with that email exists
        let user = await User.findOne({ email: email}).exec();
        // console.log('USER EXISTS', user);
        if(!user) return res.status(400).send('User with that email does not exist');
        // Compare password
        user.comparePassword(password, (err, match) => {
            if(!match || err) {
                console.log('COMPARE PASSWORD IN LOGIN ERR', err);
                return res.status(400).send('Wrong Password');
            }
            // GENERATE A TOKEN THEN SEND AS RESPONSE TO CLIENT
             let token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
                 expiresIn: '7d'
             });
             res.json({
                token,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                    stripe_account_id: user.stripe_account_id,
                    stripe_seller: user.stripe_seller,
                    stripeSession: user.stripeSession
             },
            });
        });
    } catch (err) {
        console.log('LOGIN ERROR', err);
        res.status(400).send('Sign in failed');
    }
}