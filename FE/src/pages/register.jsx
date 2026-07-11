import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '../components/ui/field';
import { Input } from '../components/ui/input';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, clearAuthError } from '../store/slices/authSlice';
import { cn } from '../lib/utils';

export function SignupForm() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', password: '', confirmPassword: '' });

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearAuthError());
    }
  }, [error, dispatch]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function validateForm() {
    const errs = { name: '', email: '', password: '', confirmPassword: '' };
    let valid = true;
    if (!form.name) { errs.name = 'Name is required.'; valid = false; }
    else if (form.name.length < 3) { errs.name = 'Name must be at least 3 characters.'; valid = false; }
    if (!form.email) { errs.email = 'Email is required.'; valid = false; }
    else if (!emailRegex.test(form.email)) { errs.email = 'Please enter a valid email.'; valid = false; }
    if (!form.password) { errs.password = 'Password is required.'; valid = false; }
    else if (form.password.length < 6) { errs.password = 'Password must be at least 6 characters.'; valid = false; }
    if (!form.confirmPassword) { errs.confirmPassword = 'Please confirm your password.'; valid = false; }
    else if (form.password !== form.confirmPassword) { errs.confirmPassword = 'Passwords do not match.'; valid = false; }
    setFieldErrors(errs);
    return valid;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      const result = await dispatch(registerUser({
        name: form.name,
        email: form.email,
        password: form.password,
      })).unwrap();
      toast.success(`Account created! Welcome aboard, ${result.user.name}! 🎉`);
      navigate('/', { replace: true });
    } catch (err) {
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md shadow-xl">
        <Card>
          <CardHeader>
            <CardTitle>Create an account</CardTitle>
            <CardDescription>Fill in your details to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <FieldGroup className="space-y-4">

                <Field>
                  <FieldLabel htmlFor="name">Full Name</FieldLabel>
                  <Input
                    id="name" name="name" type="text"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={handleChange}
                    className={cn(fieldErrors.name && 'border-destructive focus-visible:ring-destructive')}
                  />
                  {fieldErrors.name && <p className="text-sm text-red-600 mt-1">{fieldErrors.name}</p>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email" name="email" type="text"
                    placeholder="m@example.com"
                    value={form.email}
                    onChange={handleChange}
                    className={cn(fieldErrors.email && 'border-destructive focus-visible:ring-destructive')}
                  />
                  {fieldErrors.email && <p className="text-sm text-red-600 mt-1">{fieldErrors.email}</p>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password" name="password" type="password"
                    value={form.password}
                    onChange={handleChange}
                    className={cn(fieldErrors.password && 'border-destructive focus-visible:ring-destructive')}
                  />
                  {fieldErrors.password && <p className="text-sm text-red-600 mt-1">{fieldErrors.password}</p>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                  <Input
                    id="confirmPassword" name="confirmPassword" type="password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className={cn(fieldErrors.confirmPassword && 'border-destructive focus-visible:ring-destructive')}
                  />
                  {fieldErrors.confirmPassword && (
                    <p className="text-sm text-red-600 mt-1">{fieldErrors.confirmPassword}</p>
                  )}
                </Field>

                <Field className="pt-2">
                  <Button type="submit" className="w-full bg-black text-white hover:bg-neutral-800" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                  <FieldDescription className="text-center mt-2">
                    Already have an account?{' '}
                    <Link to="/login" className="underline underline-offset-4 hover:text-primary">Log in</Link>
                  </FieldDescription>
                </Field>

              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
