import nodemailer from "nodemailer";
import config from "../config";

export const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: config.email_sender || config.smtp_user,
		pass: config.smtp_password,
	},
});
