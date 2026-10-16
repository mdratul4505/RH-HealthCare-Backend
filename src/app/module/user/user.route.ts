import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { upload } from "../../lib/multer";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";

const router = Router();

router.patch(
	"/profile-image",
	auth(Role.SUPER_ADMIN, Role.ADMIN, Role.DOCTOR, Role.PATIENT),
	upload.single("profileImage"),
	UserController.uploadProfileImage,
);

router.post(
	"/create-admin",
	auth(Role.SUPER_ADMIN, Role.ADMIN),
	validateRequest(UserValidation.CreateAdminZodSchema),
	UserController.createAdmin,
);

router.post(
	"/create-super-admin",
	auth(Role.SUPER_ADMIN),
	validateRequest(UserValidation.CreateAdminZodSchema),
	UserController.createSuperAdmin,
);

router.patch(
	"/status/:userId",
	auth(Role.SUPER_ADMIN, Role.ADMIN),
	validateRequest(UserValidation.UpdateUserStatusZodSchema),
	UserController.updateUserStatus,
);

router.get(
	"/admins",
	auth(Role.SUPER_ADMIN, Role.ADMIN),
	UserController.getAllAdmins,
);

router.get(
	"/patients",
	auth(Role.SUPER_ADMIN, Role.ADMIN),
	UserController.getAllPatients,
);

export const UserRoutes = router;
