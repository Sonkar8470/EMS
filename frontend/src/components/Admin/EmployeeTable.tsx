import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { userAPI } from "@/services/api";

interface Employee {
  id?: string;
  _id?: string; // MongoDB's default field
  employeeId?: string; // User-friendly employee ID (e.g., 2025-001)
  name: string;
  email: string;
  role: string;
  mobile?: string;
  position?: string;
  address?: string;
  joiningDate?: string | Date;
}

export default function EmployeeTable() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Employee, "id">>({
    name: "",
    email: "",
    role: "employee",
    mobile: "",
    position: "",
    address: "",
    joiningDate: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Employee, string>>>(
    {}
  );
  const [sortKey, setSortKey] = useState<string>("employeeId");
  const [searchQuery, setSearchQuery] = useState<string>("");



  // Fetch Employees - Only show users with role "employee"
  const fetchEmployees = async () => {
    try {
      const response = await userAPI.getAllUsers();
      const data = response.data;
      console.log("Fetched users:", data);
      
      // Filter only users with role "employee" and map _id to id for consistency
      const employeeUsers = data
        .filter((user: Employee) => user.role === "employee")
        .map((user: Employee) => ({
          ...user,
          id: user.id || user._id // Use id if available, otherwise use _id
        }));
      console.log("Filtered employees:", employeeUsers);
      setEmployees(employeeUsers);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  useEffect(() => {
    console.log("EmployeeTable: Fetching employees...");
    fetchEmployees();
  }, []);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };


  // Validation function
  const validateForm = () => {
    let valid = true;
    const newErrors: Partial<Record<keyof Employee, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
      valid = false;
    }
    if (formData.mobile && !/^\d{10}$/.test(formData.mobile.trim())) {
      newErrors.mobile = "Phone number must be exactly 10 digits";
      valid = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Invalid email address";
      valid = false;
    }
    if (formData.position && !formData.position.trim()) {
      newErrors.position = "Position is required";
      valid = false;
    }
    if (formData.address && !formData.address.trim()) {
      newErrors.address = "Address is required";
      valid = false;
    }
    // Optional: joiningDate basic validation
    if (formData.joiningDate && isNaN(Date.parse(String(formData.joiningDate)))) {
      newErrors.joiningDate = "Invalid date";
      valid = false;
    }

    // Duplicate check
    const isDuplicate = employees.some(
      (emp) =>
        emp.name.trim().toLowerCase() === formData.name.trim().toLowerCase() &&
        emp.email.trim() === formData.email.trim() &&
        emp.id !== editingId
    );
    if (isDuplicate) {
      newErrors.name = "This employee already exists";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  // Update Employee Only (No Add functionality)
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (editingId) {
        const res = await userAPI.updateUser(editingId, formData);

        if (res.status === 200) {
          setDialogOpen(false);
          setFormData({
            name: "",
            email: "",
            role: "employee",
            mobile: "",
            position: "",
            address: "",
            joiningDate: "",
          });
          setEditingId(null);
          fetchEmployees();
        } else {
          console.error("Failed to update employee:", res.statusText);
        }
      }
    } catch (err) {
      console.error("Error updating employee:", err);
    }
  };

  // Edit Employee
  const handleEdit = (emp: Employee) => {
    setFormData({
      name: emp.name,
      email: emp.email,
      role: emp.role,
      mobile: emp.mobile || "",
      position: emp.position || "",
      address: emp.address || "",
      joiningDate: emp.joiningDate
        ? new Date(emp.joiningDate).toISOString().slice(0, 10)
        : "",
    });
    setEditingId(emp.id || null);
    setErrors({});
    setDialogOpen(true);
  };

  // Delete Employee
  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm("Are you sure you want to delete this employee?")) return;

    try {
      const res = await userAPI.deleteUser(id);
      if (res.status === 200) {
        fetchEmployees();
      } else {
        console.error("Failed to delete employee:", res.statusText);
      }
    } catch (err) {
      console.error("Error deleting employee:", err);
    }
  };

  // Filter + Sort Employees
  const filteredEmployees = employees.filter((emp) =>
    Object.values(emp).some((value) =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (sortKey === "name" || sortKey === "position") {
      const aValue = a[sortKey as keyof Employee] || "";
      const bValue = b[sortKey as keyof Employee] || "";
      return String(aValue).localeCompare(String(bValue));
    } else if (sortKey === "employeeId") {
      // For employee ID field, handle "Pending" values
      const aValue = a.employeeId || "Pending";
      const bValue = b.employeeId || "Pending";
      if (aValue === "Pending" && bValue === "Pending") return 0;
      if (aValue === "Pending") return 1;
      if (bValue === "Pending") return -1;
      return aValue.localeCompare(bValue);
    } else {
      // For other fields, use string comparison
      const aValue = String(a[sortKey as keyof Employee] || "");
      const bValue = String(b[sortKey as keyof Employee] || "");
      return aValue.localeCompare(bValue);
    }
  });

  const formatDate = (value?: string | Date) => {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "-";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  return (
    <div className="p-2 sm:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">Employee List</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Showing users with role: "employee" ({employees.length} employees)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Search Bar */}
          <Input
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-[200px] h-10 sm:h-9 text-sm"
          />

          {/* Sorting Dropdown */}
          <Select value={sortKey} onValueChange={(value) => setSortKey(value)}>
            <SelectTrigger className="w-full sm:w-[160px] h-10 sm:h-9 text-sm">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="employeeId">Sort by Employee ID</SelectItem>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="position">Sort by Position</SelectItem>
            </SelectContent>
          </Select>

        </div>
      </div>

      {/* Mobile Cards View */}
      <div className="block sm:hidden space-y-3">
        {sortedEmployees.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500">
              <p className="text-base font-medium">No employees found</p>
              <p className="text-xs mt-1">
                {searchQuery 
                  ? "Try adjusting your search criteria" 
                  : "No users with role 'employee' exist in the database"
                }
              </p>
            </div>
          </div>
        ) : (
          sortedEmployees.map((emp) => (
            <Card key={emp.id || emp._id} className="p-3">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="font-medium text-sm">{emp.name}</div>
                  <div className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    {emp.employeeId || "Pending"}
                  </div>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>📧 {emp.email}</div>
                  <div>📱 {emp.mobile || "-"}</div>
                  <div>💼 {emp.position || "-"}</div>
                  <div>📅 Joined: {formatDate(emp.joiningDate)}</div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(emp)}
                    className="flex-1 h-8 text-xs"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(emp.id)}
                    className="flex-1 h-8 text-xs"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block border rounded-md overflow-x-auto">
        <table className="w-full table-auto">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Employee ID</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Mobile</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Position</th>
              <th className="px-4 py-2 text-left">Address</th>
              <th className="px-4 py-2 text-left">Joining Date</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedEmployees.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8">
                  <div className="text-gray-500">
                    <p className="text-lg font-medium">No employees found</p>
                    <p className="text-sm mt-1">
                      {searchQuery 
                        ? "Try adjusting your search criteria" 
                        : "No users with role 'employee' exist in the database"
                      }
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedEmployees.map((emp) => (
                <tr key={emp.id || emp._id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{emp.employeeId || "Pending"}</td>
                  <td className="px-4 py-2">{emp.name}</td>
                  <td className="px-4 py-2">{emp.mobile || "-"}</td>
                  <td className="px-4 py-2">{emp.email}</td>
                  <td className="px-4 py-2">{emp.position || "-"}</td>
                  <td className="px-4 py-2">{emp.address || "-"}</td>
                  <td className="px-4 py-2">{formatDate(emp.joiningDate)}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(emp)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(emp.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Dialog (No Add functionality) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm sm:max-w-md mx-auto">
          <div className="grid gap-4">
            <div className="text-base sm:text-lg font-semibold">Edit Employee</div>
            
            <div className="grid gap-2">
              <Label className="text-sm">Name</Label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="h-10 sm:h-9 text-sm"
              />
              {errors.name && (
                <p className="text-red-500 text-xs sm:text-sm">{errors.name}</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label className="text-sm">Mobile</Label>
              <Input
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                pattern="\d{10}"
                maxLength={10}
                placeholder="10-digit mobile number"
                className="h-10 sm:h-9 text-sm"
              />
              {errors.mobile && (
                <p className="text-red-500 text-xs sm:text-sm">{errors.mobile}</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label className="text-sm">Email</Label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="h-10 sm:h-9 text-sm"
              />
              {errors.email && (
                <p className="text-red-500 text-xs sm:text-sm">{errors.email}</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label className="text-sm">Position</Label>
              <Input
                name="position"
                value={formData.position}
                onChange={handleChange}
                className="h-10 sm:h-9 text-sm"
              />
              {errors.position && (
                <p className="text-red-500 text-xs sm:text-sm">{errors.position}</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label className="text-sm">Address</Label>
              <Input
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="h-10 sm:h-9 text-sm"
              />
              {errors.address && (
                <p className="text-red-500 text-xs sm:text-sm">{errors.address}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label className="text-sm">Joining Date</Label>
              <Input
                type="date"
                name="joiningDate"
                value={String(formData.joiningDate || "")}
                onChange={handleChange}
                className="h-10 sm:h-9 text-sm"
              />
              {errors.joiningDate && (
                <p className="text-red-500 text-xs sm:text-sm">{errors.joiningDate}</p>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSubmit} className="flex-1 h-10 sm:h-9 text-sm">
                Update Employee
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setDialogOpen(false);
                  setEditingId(null);
                  setFormData({
                    name: "",
                    email: "",
                    role: "employee",
                    mobile: "",
                    position: "",
                    address: "",
                    joiningDate: "",
                  });
                  setErrors({});
                }}
                className="flex-1 h-10 sm:h-9 text-sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}