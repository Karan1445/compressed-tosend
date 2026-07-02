import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '../components/ui/field';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, forgotPassword, clearAuthError } from '../store/slices/authSlice';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '../components/ui/dialog';

export function LoginForm({ className }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearAuthError());
    }
  }, [error, dispatch]);

  useEffect(() => { setForgotEmail(''); }, [isDialogOpen]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function validateForm() {
    const errs = { email: '', password: '' };
    let valid = true;
    if (!form.email) { errs.email = 'Email is required.'; valid = false; }
    else if (!emailRegex.test(form.email)) { errs.email = 'Please enter a valid email.'; valid = false; }
    if (!form.password) { errs.password = 'Password is required.'; valid = false; }
    else if (form.password.length < 6) { errs.password = 'Password must be at least 6 characters.'; valid = false; }
    setFieldErrors(errs);
    return valid;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      const result = await dispatch(loginUser(form)).unwrap();
      toast.success(`Welcome back, ${result.user.name}!`);
      navigate('/', { replace: true });
    } catch (err) {
    }
  }

  async function handleForgotPassword() {
    if (!forgotEmail) { toast.error('Email is required.'); return; }
    if (!emailRegex.test(forgotEmail)) { toast.warning('Enter a valid email address.'); return; }
    try {
      setForgotLoading(true);
      await dispatch(forgotPassword(forgotEmail)).unwrap();
      toast.success('A temporary password has been sent to your email!');
      setIsDialogOpen(false);
    } catch (err) {
      toast.error(err || 'Failed to send password reset email.');
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md shadow-xl">
        <div className={cn('flex flex-col gap-6', className)}>
          <Card>
            <CardHeader>
              <CardTitle>Login to your account</CardTitle>
              <CardDescription>Enter your email below to login to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <FieldGroup className="space-y-4">

                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email" name="email" type="text"
                      placeholder="m@example.com"
                      value={form.email}
                      onChange={handleChange}
                      className={cn(fieldErrors.email && 'border-destructive focus-visible:ring-destructive')}
                    />
                    {fieldErrors.email && (
                      <p className="text-sm font-medium text-red-600 mt-1">{fieldErrors.email}</p>
                    )}
                  </Field>

                  <Field>
                    <div className="flex items-center">
                      <FieldLabel htmlFor="password">Password</FieldLabel>
                      {/* Forgot password dialog */}
                      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                          <button className="ml-auto inline-block text-sm underline-offset-4 hover:underline cursor-pointer">
                            Forgot your password?
                          </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] bg-white">
                          <DialogHeader>
                            <DialogTitle>Reset password</DialogTitle>
                            <DialogDescription>
                              Enter your email and we'll send you a temporary password.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="reset-email">Email address</Label>
                              <Input
                                id="reset-email" type="email"
                                placeholder="you@example.com"
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              type="button"
                              className="w-full bg-black text-white mt-2"
                              onClick={handleForgotPassword}
                              disabled={forgotLoading}
                            >
                              {forgotLoading ? 'Sending...' : 'Send temporary password'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <Input
                      id="password" name="password" type="password"
                      value={form.password}
                      onChange={handleChange}
                      className={cn(fieldErrors.password && 'border-destructive focus-visible:ring-destructive')}
                    />
                    {fieldErrors.password && (
                      <p className="text-sm font-medium text-red-600 mt-1">{fieldErrors.password}</p>
                    )}
                  </Field>

                  <Field className="pt-2">
                    <Button type="submit" variant="outline" className="w-full" disabled={loading}>
                      {loading ? 'Logging in...' : 'Login'}
                    </Button>
                    <FieldDescription className="text-center mt-2">
                      Don&apos;t have an account?{' '}
                      <Link to="/register" className="underline underline-offset-4 hover:text-primary">
                        Sign up
                      </Link>
                    </FieldDescription>
                  </Field>

                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}