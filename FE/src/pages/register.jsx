import { Link, useNavigate } from "react-router-dom"
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger
} from "../components/ui/dropdown-menu"
import { useState } from "react"
import { toast } from "sonner"

export function SignupForm() {
    const [signupObject, setSignupObject] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "Sender"
    })

    const [errors, setErrors] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    })

    const [loading, setLoading] = useState(false)
    const navigator = useNavigate();

    function handleChange(e) {
        const { name, value } = e.target
        setSignupObject({ ...signupObject, [name]: value })
        setErrors((prev) => ({ ...prev, [name]: "" }))
    }

    function handleRoleChange(value) {
        setSignupObject({ ...signupObject, role: value })
    }

    function validateForm() {
        let valid = true
        const newErrors = { email: "", password: "", confirmPassword: "" }

        if (!signupObject.name) {
            newErrors.name = "Name is required.";
            valid = false
        } else if (signupObject.name.length < 3) {
            newErrors.name = "Please provide valid name";
            valid = false
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!signupObject.email) {
            newErrors.email = "Email is required."
            valid = false
        } else if (!emailRegex.test(signupObject.email)) {
            newErrors.email = "Please provide a valid email address."
            valid = false
        }

        if (!signupObject.password) {
            newErrors.password = "Password is required."
            valid = false
        } else if (signupObject.password.length < 6) {
            newErrors.password = "Password must be at least 6 characters long."
            valid = false
        }

        if (!signupObject.confirmPassword) {
            newErrors.confirmPassword = "Please confirm your password."
            valid = false
        } else if (signupObject.password !== signupObject.confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match."
            valid = false
        }

        setErrors(newErrors)
        return valid
    }

    async function handleSubmit(e) {
        e.preventDefault()

        if (!validateForm()) return

        setLoading(true)

        const payload = {
            name: signupObject.name,
            email: signupObject.email,
            password: signupObject.password,
            role: signupObject.role
        }

        try {
            const response = await fetch("http://localhost:8888/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            })

            const data = await response.json()
            if (!response.ok) {
                const backendError = data.error || (data.errors ? data.errors.join(", ") : "Registration failed")
                throw new Error(backendError)
            }

            toast.success("Account created successfully!")
            sessionStorage.setItem("token", data?.token)
            sessionStorage.setItem("user", JSON.stringify({ ...data?.user }));
            navigator("/",{ replace: true })

            setSignupObject({ name: "", email: "", password: "", confirmPassword: "", role: "Sender" })

        } catch (err) {
            toast.error(err.message || "An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }
    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-lg shadow-xl">
                <Card>
                    <CardHeader>
                        <CardTitle>Create an account</CardTitle>
                        <CardDescription>
                            Enter your information below to create your account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit}>
                            <FieldGroup className="space-y-4">

                                <Field>
                                    <FieldLabel htmlFor="email">Name</FieldLabel>
                                    <Input
                                        id="name"
                                        type="text"
                                        name="name"
                                        placeholder="Karan Gohel"
                                        value={signupObject.name}
                                        onChange={handleChange}
                                        className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                                    />
                                    {errors.name && (
                                        <p className="text-sm font-medium text-red-600 mt-1">{errors.name}</p>
                                    )}
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="email">Email</FieldLabel>
                                    <Input
                                        id="email"
                                        type="text"
                                        name="email"
                                        placeholder="m@MindInventory.com"
                                        value={signupObject.email}
                                        onChange={handleChange}
                                        className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                                    />
                                    {errors.email && (
                                        <p className="text-sm font-medium text-red-600 mt-1">{errors.email}</p>
                                    )}
                                </Field>

                                <Field className="flex flex-col gap-1.5">
                                    <FieldLabel>Account Role</FieldLabel>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button type="button" variant="outline" className="w-full justify-start font-normal">
                                                Role: <span className="ml-1 font-semibold text-primary">{signupObject.role}</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-48 bg-popover text-popover-foreground border shadow-md p-1 rounded-md z-50">
                                            <DropdownMenuRadioGroup
                                                value={signupObject.role}
                                                onValueChange={handleRoleChange}
                                            >
                                                <DropdownMenuRadioItem value="Sender">
                                                    Sender
                                                </DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="Signer">
                                                    Signer
                                                </DropdownMenuRadioItem>
                                            </DropdownMenuRadioGroup>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="password">Password</FieldLabel>
                                    <Input
                                        id="password"
                                        type="password"
                                        name="password"
                                        value={signupObject.password}
                                        onChange={handleChange}
                                        className={errors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                                    />
                                    {errors.password && (
                                        <p className="text-sm font-medium text-red-600 mt-1">{errors.password}</p>
                                    )}
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="confirm-password">
                                        Confirm Password
                                    </FieldLabel>
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        name="confirmPassword"
                                        value={signupObject.confirmPassword}
                                        onChange={handleChange}
                                        className={errors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}
                                    />
                                    {errors.confirmPassword && (
                                        <p className="text-sm font-medium text-red-600 mt-1">{errors.confirmPassword}</p>
                                    )}
                                </Field>

                                <FieldGroup className="pt-2">
                                    <Field>
                                        <Button type="submit" variant="outline" className="w-full" disabled={loading}>
                                            {loading ? "Creating Account..." : "Create Account"}
                                        </Button>
                                        <FieldDescription className="px-6 text-center mt-2" >
                                            Already have an account? <Link to="/login" className="underline underline-offset-4 hover:text-primary">Sign in</Link>
                                        </FieldDescription>
                                    </Field>
                                </FieldGroup>

                            </FieldGroup>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )

}
