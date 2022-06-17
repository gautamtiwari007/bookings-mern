import { useEffect } from 'react';
import {useSelector } from 'react-redux';
import { stripeSuccessRequest } from '../actions/stripe';
import { LoadingOutlined } from '@ant-design/icons';

const StripeSuccess = ({ match, history }) => {

    const { auth } = useSelector((state) => ({...state}));
    const { token } = auth;

    useEffect(() => {
        stripeSuccessRequest(token, match.params.hotelId).then((res) => {
            if(res.data.success){
                // console.log('Stripe success response: ', res.data);
                history.push('/dashboard');
            } else {
                history.push('/stripe/cancel');
            }
        });
    }, [match.params.hotelId]);

    return (
        <div className="container">
            <div className="d-flex justify-content-center p-5">
                <LoadingOutlined className="display-1 text-danger pt-5" />
            </div>
        </div>
    );
};

export default StripeSuccess;