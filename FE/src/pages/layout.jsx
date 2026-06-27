import { Link, useNavigate } from "react-router-dom"
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "../components/ui/sidebar"
import { Users, FileQuestion, LogOutIcon, KeyRound, MoreVertical } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog"
import { Button } from "../components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
}
  from "../components/ui/dropdown-menu"
import { useState } from "react"
import { toast } from "sonner"

const navigationItems = [
  { title: "User List", url: "/", icon: Users },
  { title: "Add Question", url: "/question", icon: FileQuestion },
]

export default function Layout({ children }) {
  const currentUser = JSON.parse(sessionStorage.getItem("user"))
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    oldPassword: "",
    newPassword: "",
  });

  const handleChange = (e) => {
    const { id, value } = e.target;
    const key = id === "old-password" ? "oldPassword" : id === "new-password" ? "newPassword" : id;
    setFormData((prev) => ({ ...prev, [key]: value }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    const { email, oldPassword, newPassword } = formData;

    if (!email || !oldPassword || !newPassword) {
      toast.error("All fields are required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("http://localhost:8888/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          email,
          oldPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password.");
      }

      toast.success("Password reset successful. Logging you out...");

      setTimeout(() => {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");

        window.location.href = "/login";
      }, 1500);

    } catch (error) {
      toast.error(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };
  function handleLogout() {
    sessionStorage.clear("token")
    sessionStorage.clear("user")
    window.location.replace("/login");
  }
  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        <Sidebar variant="sidebar" collapsible="icon">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
                Management
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <Link to={item.url} className="flex items-center gap-3">
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t p-3">
            <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center gap-3 w-full">

              <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                <div className="flex flex-col text-left min-w-0 group-data-[collapsible=icon]:hidden">
                  <span className="text-sm font-medium leading-none truncate">{currentUser?.name ?? "Guest User"}</span>
                  <span className="text-xs text-muted-foreground truncate mt-0.5">{currentUser?.email ?? "No email provided"}</span>
                </div>
              </div>

              <div className="group-data-[collapsible=icon]:hidden">
                <AlertDialog>
                  <Dialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="w-48">
                        <DialogTrigger asChild>
                          <DropdownMenuItem className="hover:bg-gray-200">
                            <KeyRound className="mr-2 h-4 w-4" />
                            <span>Reset Password</span>
                          </DropdownMenuItem>
                        </DialogTrigger>

                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem className="text-destructive focus:text-destructive hover:bg-gray-200">
                            <LogOutIcon className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DialogContent className="bg-white sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                          Update your account password here. Click save when you are done.
                        </DialogDescription>
                      </DialogHeader>

                      {/* Wrapped in a form element to handle submit properly */}
                      <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="name@example.com"
                              value={formData.email}
                              onChange={handleChange}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="old-password">Old Password</Label>
                            <Input
                              id="old-password"
                              type="password"
                              value={formData.oldPassword}
                              onChange={handleChange}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input
                              id="new-password"
                              type="password"
                              value={formData.newPassword}
                              onChange={handleChange}
                            />
                          </div>
                        </div>

                        <DialogFooter>
                          <DialogClose asChild>
                            <Button type="button" variant="outline" disabled={loading}>
                              Cancel
                            </Button>
                          </DialogClose>
                          <Button
                            type="submit"
                            className="bg-black text-white"
                            disabled={loading}
                          >
                            {loading ? "Saving..." : "Save changes"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently Log-out your
                        account from this device.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-black text-white" onClick={handleLogout}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

            </div>
          </SidebarFooter>

        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/20 px-6 shrink-0">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-border" />
            <h1 className="text-sm font-medium text-muted-foreground">Workspace</h1>
          </header>

          <div className="p-6 md:p-8 flex-1">
            {children}
          </div>
        </main>

      </div>
    </SidebarProvider>
  )
}
