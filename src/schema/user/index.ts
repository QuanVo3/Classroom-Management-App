export type User = {
    id?: string;
    name?: string;
    phone?: string;
    email?: string;
    role?: "student" | "teacher";
    status?: "pending" | "active";
};
