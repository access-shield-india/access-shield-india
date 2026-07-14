import type { AuthDict } from '../types';

export const auth: AuthDict = {
  login: {
    title: 'Sign in to your account',
    subtitle: 'Access your accessibility dashboard',
    email: 'Email address',
    password: 'Password',
    submit: 'Sign in',
    forgotPassword: 'Forgot password?',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
  },
  signup: {
    title: 'Create your account',
    subtitle: 'Start your 14-day free trial',
    name: 'Full name',
    email: 'Work email',
    password: 'Password',
    organisation: 'Organisation name',
    submit: 'Create account',
    hasAccount: 'Already have an account?',
    signIn: 'Sign in',
  },
};
