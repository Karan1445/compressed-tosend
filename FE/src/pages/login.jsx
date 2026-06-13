import { cn } from "../lib/utils"
import { Button } from "../components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "../components/ui/field"
import { Input } from "../components/ui/input"
import { Link, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog"
import { Label } from "../components/ui/label"
export function LoginForm({ className }) {
  const [loginObject, setLoginObject] = useState({ email: "", password: "" })
  const [forgetPasswordEmail, setForgetPasswordEmail] = useState();
  const [errors, setErrors] = useState({ email: "", password: "", server: "" })
  const [loading, setLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const navigator = useNavigate("");

  useEffect(()=>{setForgetPasswordEmail("")},[isDialogOpen])

  function handleChange(e) {
    const { name, value } = e.target
    setLoginObject({ ...loginObject, [name]: value })

    setErrors((prev) => ({ ...prev, [name]: "", server: "" }))
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  function validateForm() {
    let valid = true
    const newErrors = { email: "", password: "", server: "" }


    if (!loginObject.email) {
      newErrors.email = "Email is required."
      valid = false
    } else if (!emailRegex.test(loginObject.email)) {
      newErrors.email = "Please provide a valid email address."
      valid = false
    }

    if (!loginObject.password) {
      newErrors.password = "Password is required."
      valid = false
    } else if (loginObject.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long."
      valid = false
    }

    setErrors(newErrors)
    return valid
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)

    try {
      const response = await fetch("http://localhost:8888/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(loginObject)
      })

      const data = await response.json()
      if (!response.ok) {
        const backendError = data.error || (data.errors ? data.errors.join(", ") : "Invalid credentials")
        throw new Error(backendError)
      }

      toast.success("Login Sucessfully!")
      sessionStorage.setItem("token", data.token)
      sessionStorage.setItem("user", JSON.stringify({ ...data?.user }));
      navigator("/", { replace: true })

      setErrors({ email: "", password: "", server: "" })

    } catch (err) {
      toast.error(err.message)
      setErrors((prev) => ({ ...prev, server: err.message }))
    } finally {
      setLoading(false)
    }
  }

  const handleForgetMail = async (e) => {
    if (!forgetPasswordEmail) {
      toast.error("Mail is required!")
      return;
    }
    else if (!emailRegex.test(forgetPasswordEmail)) {
      toast.warning("Enter valid email address!")
      return;
    }
    const fillerObject = { 'email': forgetPasswordEmail }
    const response = await fetch("http://localhost:8888/forgot-password", {
      method: "POST", headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(fillerObject)
    })

    if (response.ok) {
      toast.success("New Password is sended on your registed mail address!")
      setIsDialogOpen(false)
    } else {
      const data = await response.json()
      console.log(data)
      toast.error(data?.error)
    }
  }
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md shadow-xl">
        <div className={cn("flex flex-col gap-6", className)}>
          <Card>
            <CardHeader>
              <CardTitle>Login to your account</CardTitle>
              <CardDescription>
                Enter your email below to login to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <FieldGroup className="space-y-4">

                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      type="text"
                      name="email"
                      placeholder="m@example.com"
                      value={loginObject.email}
                      onChange={handleChange}
                      className={cn(errors.email && "border-destructive focus-visible:ring-destructive")}
                    />
                    {errors.email && (
                      <p className="text-sm font-medium text-destructive mt-1 text-red-600">{errors.email}</p>
                    )}
                  </Field>

                  <Field>
                    <div className="flex items-center">
                      <FieldLabel htmlFor="password">Password</FieldLabel>
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
                              Enter your email address and we will send you a new password.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="reset-email">Email address</Label>
                              <Input
                                id="reset-email"
                                type="email"
                                placeholder="Karan@karan.com"
                                value={forgetPasswordEmail}
                                onChange={(e) => {
                                  setForgetPasswordEmail(e?.target?.value)
                                }}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="submit" className="w-full bg-black text-white mt-5" onClick={handleForgetMail}>
                              Send password
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      name="password"
                      value={loginObject.password}
                      onChange={handleChange}
                      className={cn(errors.password && "border-destructive focus-visible:ring-destructive")}
                    />
                    {errors.password && (
                      <p className="text-sm font-medium text-destructive mt-1 text-red-600">{errors.password}</p>
                    )}
                  </Field>

                  <Field className="pt-2">
                    <Button type="submit" variant="outline" className="w-full" disabled={loading}>
                      {loading ? "Logging in..." : "Login"}
                    </Button>
                    <FieldDescription className="text-center mt-2">
                      Don&apos;t have an account? <Link to="/register" className="underline underline-offset-4 hover:text-primary">Sign up</Link>
                    </FieldDescription>
                  </Field>

                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}