import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { UserServices } from "./user.service";

const uploadProfileImage = catchAsync(async (req: Request, res: Response) => {
	if (!req.file) {
		throw new AppError(httpStatus.BAD_REQUEST, "No File Provided.");
	}

	const userId = req.user?.userId;

	const result = await UserServices.uploadProfileImage(
		req.file?.buffer,
		userId!,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Profile image uploaded successfully",
		data: result,
	});
});

const createAdmin = catchAsync(async (req: Request, res: Response) => {
	const result = await UserServices.createAdmin(req.body, req.user!);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Admin created successfully and credentials sent to personal email",
		data: result,
	});
});

const createSuperAdmin = catchAsync(async (req: Request, res: Response) => {
	const result = await UserServices.createSuperAdmin(req.body, req.user!);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Super Admin created successfully and credentials sent to personal email",
		data: result,
	});
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
	const { userId } = req.params;
	const result = await UserServices.updateUserStatus(
		userId as string,
		req.body,
		req.user!,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: `User status updated to ${req.body.status} successfully`,
		data: result,
	});
});

const getAllAdmins = catchAsync(async (req: Request, res: Response) => {
	const result = await UserServices.getAllAdmins(req.query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Admins fetched successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getAllPatients = catchAsync(async (req: Request, res: Response) => {
	const result = await UserServices.getAllPatients(req.query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Patients fetched successfully",
		meta: result.meta,
		data: result.data,
	});
});

export const UserController = {
	uploadProfileImage,
	createAdmin,
	createSuperAdmin,
	updateUserStatus,
	getAllAdmins,
	getAllPatients,
};
