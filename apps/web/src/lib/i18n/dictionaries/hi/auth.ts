import type { AuthDict } from '../types';

export const auth: AuthDict = {
  login: {
    title: 'अपने account में sign in करें',
    subtitle: 'अपना accessibility dashboard खोलें',
    email: 'Email address',
    password: 'Password',
    submit: 'Sign in',
    forgotPassword: 'Password भूल गए?',
    noAccount: 'Account नहीं है?',
    signUp: 'Sign up',
  },
  signup: {
    title: 'Account बनाएँ',
    subtitle: '14-day free trial शुरू करें',
    name: 'पूरा नाम',
    email: 'Work email',
    password: 'Password',
    organisation: 'Organisation का नाम',
    submit: 'Account बनाएँ',
    hasAccount: 'पहले से account है?',
    signIn: 'Sign in',
  },
};
