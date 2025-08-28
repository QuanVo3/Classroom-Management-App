import { Timestamp } from "firebase-admin/firestore";

export type Lesson = {
    id: string;
    title: string;
    description: string;
    createdBy: string;
    assignedTo: string[];
    createdAt: Timestamp;
};
