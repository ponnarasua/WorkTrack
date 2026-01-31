import React ,{useState, useContext } from 'react';
import AuthLayout from '../../components/layout/AuthLayout';
import { Link, useNavigate } from 'react-router-dom';
import Input from '../../components/Inputs/Input';
import { validateEmail } from '../../utils/helper';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import { UserContext } from '../../context/userContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const { updateUser } = useContext(UserContext);
  const navigate = useNavigate();

  //Handle Login Form Submit
  const handleLogin = async (e) => {
    e.preventDefault();

    if(!validateEmail(email)){
      setError('Please enter a valid email address');
      return;
    } 

    if(!password){
      setError('Please enter your password');
      return;
    }

    setError("");

    //Login API CALL
    try{
      const response = await axiosInstance.post(API_PATHS.AUTH.LOGIN, {
        email,
        password,
      },{
        withCredentials: true,
      });
      const { role } = response.data;

      // Token is now in httpOnly cookie, no need to store in localStorage
      updateUser(response.data);

      // Redirect based on role
      if(role === 'admin'){
        navigate('/admin/dashboard');
      }else{
        navigate('/user/dashboard');
      }
    }catch(error){
      if(error.response && error.response.data.message){
        setError(error.response.data.message);
      }else {
        setError("Something went wrong. Please try again later.");
      }
    }
  };  
  return (
    <AuthLayout>
      <div className='lg:w-[70%] h-3/4 md:h-full flex flex-col justify-center '>
        <h3 className='text-xl font-semibold text-gray-900 dark:text-white'>Welcome Back</h3>
        <p className='text-xs text-slate-700 dark:text-gray-400 mt-[5px] mb-6'>
          Please enter your Details to Login.
        </p>

        <form onSubmit={handleLogin}>
          <Input 
            value={email}
            onChange={({target})=>setEmail(target.value)}
            label='Email Address'
            placeholder='john@example.com'
            type='text'
            />
          <Input 
            value={password}
            onChange={({target})=>setPassword(target.value)}
            label='Password'
            placeholder='Min 8 Characters'
            type='password'
            />

            {error && <p className='text-red-500 text-xs pb-2.5'>{error}</p>}

            <button type='submit' className='btn-primary'>LOGIN</button>

            <div className='flex items-center justify-between mt-3'>
              <p className='text-[13px] text-slate-700 dark:text-gray-400'>
                Don't have an account?{" "}
                <Link className='font-medium text-primary underline' to ='/signup'>Sign Up</Link>
              </p>
              <Link className='text-[13px] font-medium text-primary underline' to='/forgot-password'>
                Forgot Password?
              </Link>
            </div>
        </form>
      </div>
    </AuthLayout>
  )
}

export default Login;