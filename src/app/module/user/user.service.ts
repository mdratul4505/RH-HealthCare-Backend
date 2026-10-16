import bcrypt from "bcryptjs";
import type { UploadApiResponse } from "cloudinary";
import ejs from "ejs";
import httpStatus from "http-status";
import path from "path";
import { Role, UserStatus } from "../../../generated/prisma/enums";
import config from "../../config";
import type { IQuery } from "../../interfaces";
import { cloudinary } from "../../lib/cloudinary";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import generateRandomPassword from "../../utils/randomPassword";
import type {
	ICreateAdminPayload,
	IUpdateUserStatusPayload,
} from "./user.interface";

const uploadProfileImage = async (buffer: Buffer, userId: string) => {
	const currentUser = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		select: {
			imagePublicId: true,
			imageUrl: true,
		},
	});

	const cloudinaryResult = await new Promise<UploadApiResponse>(
		(resolve, reject) => {
			cloudinary.uploader
				.upload_stream(
					{
						resource_type: "auto",
					},
					async (error, result) => {
						if (error) {
							return reject(error);
						}

						if (!result) {
							return reject(new Error("No result returned from Cloudinary"));
						}

						resolve(result);
					},
				)
				.end(buffer);
		},
	);

	const updatedUser = await prisma.user.update({
		where: {
			id: userId,
		},
		data: {
			imageUrl: cloudinaryResult.secure_url,
			imagePublicId: cloudinaryResult.public_id,
		},
		omit: {
			password: true,
		},
	});

	if (currentUser?.imagePublicId && currentUser.imageUrl) {
		await cloudinary.uploader.destroy(currentUser.imagePublicId);
	}

	return updatedUser;
};

const createAdmin = async (
	payload: ICreateAdminPayload,
	creatorUser: RequestUser,
) => {
	const organizationEmail = payload.email.trim().toLowerCase();
	const personalEmail = payload.personalEmail.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email: organizationEmail },
	});

	if (isUserExists) {
		throw new AppError(
			httpStatus.CONFLICT,
			"A user with this organization email already exists.",
		);
	}

	const generatedPassword = generateRandomPassword();
	const hashedPassword = await bcrypt.hash(
		generatedPassword,
		Number(config.bcrypt_salt_rounds) || 8,
	);

	const createdAdmin = await prisma.user.create({
		data: {
			name: payload.name,
			email: organizationEmail,
			password: hashedPassword,
			role: Role.ADMIN,
			status: UserStatus.ACTIVE,
			needPasswordChange: true,
			emailVerified: true,
			admin: {
				create: {
					name: payload.name,
					email: organizationEmail,
					personalEmail: personalEmail,
					contactNumber: payload.contactNumber,
					address: payload.address,
				},
			},
		},
		include: {
			admin: true,
		},
		omit: {
			password: true,
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/admin-welcome-email.ejs",
	);

	const templateData = {
		name: payload.name,
		role: Role.ADMIN,
		organizationEmail,
		password: generatedPassword,
	};

	try {
		const html = await ejs.renderFile(templatePath, templateData);
		await transporter.sendMail({
			from: config.email_sender,
			to: personalEmail,
			subject: "Admin Account Created - PH Healthcare System",
			html,
		});
	} catch (error) {
		console.log("Failed to send admin welcome email:", error);
	}

	return createdAdmin;
};

const createSuperAdmin = async (
	payload: ICreateAdminPayload,
	creatorUser: RequestUser,
) => {
	if (creatorUser.role !== Role.SUPER_ADMIN) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Only a Super Admin can create another Super Admin.",
		);
	}

	const organizationEmail = payload.email.trim().toLowerCase();
	const personalEmail = payload.personalEmail.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email: organizationEmail },
	});

	if (isUserExists) {
		throw new AppError(
			httpStatus.CONFLICT,
			"A user with this organization email already exists.",
		);
	}

	const generatedPassword = generateRandomPassword();
	const hashedPassword = await bcrypt.hash(
		generatedPassword,
		Number(config.bcrypt_salt_rounds) || 8,
	);

	const createdSuperAdmin = await prisma.user.create({
		data: {
			name: payload.name,
			email: organizationEmail,
			password: hashedPassword,
			role: Role.SUPER_ADMIN,
			status: UserStatus.ACTIVE,
			needPasswordChange: true,
			emailVerified: true,
			admin: {
				create: {
					name: payload.name,
					email: organizationEmail,
					personalEmail: personalEmail,
					contactNumber: payload.contactNumber,
					address: payload.address,
				},
			},
		},
		include: {
			admin: true,
		},
		omit: {
			password: true,
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/admin-welcome-email.ejs",
	);

	const templateData = {
		name: payload.name,
		role: Role.SUPER_ADMIN,
		organizationEmail,
		password: generatedPassword,
	};

	try {
		const html = await ejs.renderFile(templatePath, templateData);
		await transporter.sendMail({
			from: config.email_sender,
			to: personalEmail,
			subject: "Super Admin Account Created - PH Healthcare System",
			html,
		});
	} catch (error) {
		console.log("Failed to send super admin welcome email:", error);
	}

	return createdSuperAdmin;
};

const updateUserStatus = async (
	targetUserId: string,
	payload: IUpdateUserStatusPayload,
	currentUser: RequestUser,
) => {
	const targetUser = await prisma.user.findUnique({
		where: { id: targetUserId },
	});

	if (!targetUser || targetUser.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Target user not found.");
	}

	if (targetUser.id === currentUser.userId) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"You cannot modify your own account status.",
		);
	}

	// Permission rules according to Section 2.1:
	// Admin can block/unblock Doctor and Patient.
	// Only Super Admin can block/unblock Admin or Super Admin.
	if (
		targetUser.role === Role.ADMIN ||
		targetUser.role === Role.SUPER_ADMIN
	) {
		if (currentUser.role !== Role.SUPER_ADMIN) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				`Only Super Admin can block or unblock ${targetUser.role === Role.SUPER_ADMIN ? "a Super Admin" : "an Admin"}.`,
			);
		}
	}

	const updatedUser = await prisma.user.update({
		where: { id: targetUser.id },
		data: {
			status: payload.status,
		},
		omit: {
			password: true,
		},
	});

	return updatedUser;
};

const getAllAdmins = async (query: IQuery) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy || "createdAt";
	const sortOrder = query.sortOrder || "desc";

	const whereConditions: any = {
		role: {
			in: [Role.ADMIN, Role.SUPER_ADMIN],
		},
		isDeleted: false,
	};

	if (query.status) {
		whereConditions.status = query.status;
	}

	if (query.searchTerm) {
		whereConditions.OR = [
			{ name: { contains: query.searchTerm, mode: "insensitive" } },
			{ email: { contains: query.searchTerm, mode: "insensitive" } },
		];
	}

	const [admins, total] = await Promise.all([
		prisma.user.findMany({
			where: whereConditions,
			take: limit,
			skip,
			orderBy: {
				[sortBy]: sortOrder,
			},
			include: {
				admin: true,
			},
			omit: {
				password: true,
			},
		}),
		prisma.user.count({ where: whereConditions }),
	]);

	return {
		data: admins,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const getAllPatients = async (query: IQuery) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy || "createdAt";
	const sortOrder = query.sortOrder || "desc";

	const whereConditions: any = {
		role: Role.PATIENT,
		isDeleted: false,
	};

	if (query.status) {
		whereConditions.status = query.status;
	}

	if (query.searchTerm) {
		whereConditions.OR = [
			{ name: { contains: query.searchTerm, mode: "insensitive" } },
			{ email: { contains: query.searchTerm, mode: "insensitive" } },
		];
	}

	const [patients, total] = await Promise.all([
		prisma.user.findMany({
			where: whereConditions,
			take: limit,
			skip,
			orderBy: {
				[sortBy]: sortOrder,
			},
			include: {
				patient: true,
			},
			omit: {
				password: true,
			},
		}),
		prisma.user.count({ where: whereConditions }),
	]);

	return {
		data: patients,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

export const UserServices = {
	uploadProfileImage,
	createAdmin,
	createSuperAdmin,
	updateUserStatus,
	getAllAdmins,
	getAllPatients,
};
