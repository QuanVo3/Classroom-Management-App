import { Timestamp } from "firebase-admin/firestore";

export type User = {
    id?: string;
    name?: string;
    phone?: string;
    email?: string;
    role?: "student" | "teacher";
    status?: "pending" | "active";
};

export type Assignments = {
    id: string,
    lessonId: string,
    studentId: string,
    status: "assigned" | "done",
    assignedAt: Timestamp,
    updatedAt?: Timestamp
}
