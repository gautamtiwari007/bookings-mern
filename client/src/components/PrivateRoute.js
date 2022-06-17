import { Route, Redirect } from 'react-router-dom';
import { useSelector } from 'react-redux';

const PrivateRoute = ({ ...rest }) => {
    
    const { auth } = useSelector((state) => ({...state}));
    
    //console.log(window.localStorage.getItem('auth'));
    // console.log(auth);
    // console.log(auth.token);
    return ((auth && auth.token) ? <Route {...rest} /> : <Redirect to='/login' />);
};

export default PrivateRoute;