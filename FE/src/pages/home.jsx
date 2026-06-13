import React, { useEffect, useState } from "react"
import { Search, UserPlus, MoreVertical, Trash2, Shield, CheckCircle, XCircle, Users, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Badge } from "../components/ui/badge"
import { Avatar, AvatarFallback } from "../components/ui/avatar"

export default function UserDirectory() {
    const [users, setUsers] = useState([])
    const [searchTerm, setSearchTerm] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setIsLoading(true)
                const response = await fetch("http://localhost:8888/", {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${sessionStorage.getItem("token")}`
                    }
                }
                )
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const data = await response.json()
                setUsers(data)
            } catch (err) {
                console.error("Failed to fetch users:", err)
                setError(err.message)
            } finally {
                setIsLoading(false)
            }
        }

        fetchUsers()
    }, [])

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const totalUsers = users.length
    const signerCount = users.filter(u => u.role === "Signer").length

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">User Directory</h2>
                    <p className="text-sm text-muted-foreground">
                        All users are listed here.
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 ">
                <Card className="shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 ">
                        <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? "..." : totalUsers}
                        </div>
                        <p className="text-xs text-muted-foreground">Registered users</p>
                    </CardContent>
                </Card>

                <Card className="shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Signers</CardTitle>
                        <Shield className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {isLoading ? "..." : signerCount}
                        </div>
                        <p className="text-xs text-muted-foreground">Users with document signing privileges</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="px-6 py-4 border-b ">
                    <div className="flex items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search users by name or email..."
                                className="pl-8 w-full"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                disabled={isLoading || error}
                            />
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0 shadow-xl">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User Profile</TableHead>
                                    <TableHead>Database ID</TableHead>
                                    <TableHead>Role Privilege</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Loading records...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : error ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center text-destructive font-medium">
                                            Error loading users: {error}
                                        </TableCell>
                                    </TableRow>
                                ) : filteredUsers.length > 0 ? (
                                    filteredUsers.map((user) => (
                                        <TableRow key={user._id} className="hover:bg-muted/50">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarFallback className="bg-neutral-200 font-semibold uppercase">
                                                            {user.name?.substring(0, 2) || "US"}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="truncate font-medium text-sm capitalize">{user.name}</span>
                                                        <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {user._id}
                                            </TableCell>

                                            <TableCell>
                                                <Badge variant="secondary" className="font-normal bg-blue-50 text-blue-700 hover:bg-blue-50">
                                                    {user.role || "N/A"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                            No matching records found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
