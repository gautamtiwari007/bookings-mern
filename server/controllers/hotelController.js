import Hotel from '../models/hotel';
import Order from '../models/order';
import fs from 'fs';

export const create = async (req, res) => {
    try {
        let fields = req.fields;
        let files = req.files;

        let hotel = new Hotel(fields);
        hotel.postedBy = req.user._id;
        //handle image
        if(files.image) {
            hotel.image.data = fs.readFileSync(files.image.path);
            hotel.image.contentType = files.image.type;
        }
        hotel.save((err, result) => {
            if(err) {
                console.error('Saving hotel err =>',err);
                res.status(400).send('Error saving.');
            }
            res.json(result);
        });
    } catch (err) {
        console.log(err);
        res.status(400).json({
            err: err.message
        });
    }
};

export const hotels = async (req, res) => {
    // let all = await Hotel.find({ from: { $gte: new Date() }})
    let all = await Hotel.find({ })
    .limit(24)
    .select('-image.data')
    .populate('postedBy', '_id name')
    .exec();
    // console.log(all);
    res.json(all);
}

export const image = async (req, res) => {
    let hotelId = req.params.hotelId;
    console.log(hotelId);
    let hotel = await Hotel.findById(hotelId).exec();
    if(hotel && hotel.image && hotel.image.data !== null) {
        res.set("Content-Type", hotel.image.contentType);
        return res.send(hotel.image.data);
    }
};

export const sellerHotels = async (req, res) => {
    let all = await Hotel.find({ postedBy: req.user._id})
        .select('-image.data')
        .populate('postedBy', '_id name')
        .exec();
    
    res.send(all);
}

export const remove = async (req, res) => {
    let removed = await Hotel.findByIdAndDelete(req.params.hotelId).select('-image.data').exec();
    res.json(removed);
};

export const read = async (req, res) => {
    let hotel = await Hotel.findById(req.params.hotelId)
        .populate('postedBy', '_id name')
        .select('-image.data')
        .exec();
    res.json(hotel);
}

export const update = async (req, res) => {
    try {
        let fields = req.fields;
        let files = req.files;

        let data = {...fields};
        if(files.image) {
            let image = {};
            image.data = fs.readFileSync(files.image.path);
            image.contentType = files.image.type;

            data.image = image;
        }
        let updated = await Hotel.findByIdAndUpdate(req.params.hotelId, data, {
            new: true,
        }).select('-image.data');

        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status
    }
}

export const userHotelBookings = async (req, res) => {
    const all = await Order
        .find({ orderedBy: req.user._id })
        .select('session')
        .populate('hotel', '-image.data')
        .populate('orderedBy', '_id name')
        .exec();

    res.json(all);
}

export const isAlreadyBooked = async (req, res) => {
    const { hotelId } = req.params;
    // find orders of the currently logged in user
    const userOrders = await Order.find({ orderedBy: req.user._id })
        .select('hotel')
        .exec();
    // Check if hotel id is found in userOrders array
    let ids = [];
    for (let i = 0; i < userOrders.length; i++) {
        ids.push(userOrders[i].hotel.toString());
    }
    res.json({
        ok: ids.includes(hotelId),
    });
};

export const searchListings = async (req, res) => {
    const { location, date, bed } = req.body;
    const fromDate = date.split(',');
    let results = await Hotel.find({ from: { $gte: new Date(fromDate[0]) }, location})
        .select('-image.data')
        .exec();
    res.json(results);
};