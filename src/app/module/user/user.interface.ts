import type { UserStatus } from "../../../generated/prisma/enums";

export interface ICreateAdminPayload {
	name: string;
	email: string; // organization email (login identity)
	personalEmail: string; // personal inbox to receive generated credentials
	contactNumber?: string;
	address?: string;
}

export interface IUpdateUserStatusPayload {
	status: UserStatus;
}
