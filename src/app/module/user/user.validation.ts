import z from "zod";
import { UserStatus } from "../../../generated/prisma/enums";

const CreateAdminZodSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters"),
	email: z.string().email("Valid organization email is required"),
	personalEmail: z.string().email("Valid personal email is required"),
	contactNumber: z.string().optional(),
	address: z.string().optional(),
});

const UpdateUserStatusZodSchema = z.object({
	status: z.nativeEnum(UserStatus, {
		message: "Status must be ACTIVE, BLOCKED, or DELETED",
	}),
});

export const UserValidation = {
	CreateAdminZodSchema,
	UpdateUserStatusZodSchema,
};
