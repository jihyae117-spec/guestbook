import { z } from "zod";

export const entryCreateSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요.").max(20, "이름은 20자 이하로 입력해주세요."),
  content: z.string().trim().min(1, "내용을 입력해주세요.").max(500, "내용은 500자 이하로 입력해주세요."),
  password: z.string().min(4, "비밀번호는 4자 이상이어야 합니다.").max(72, "비밀번호가 너무 깁니다."),
  captchaToken: z.string().min(1, "캡차를 다시 확인해주세요."),
  captchaAnswer: z.union([z.string(), z.number()]),
});

export const entryUpdateSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요.").max(20, "이름은 20자 이하로 입력해주세요."),
  content: z.string().trim().min(1, "내용을 입력해주세요.").max(500, "내용은 500자 이하로 입력해주세요."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

export const passwordOnlySchema = z.object({
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

export const replyCreateSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요.").max(20, "이름은 20자 이하로 입력해주세요."),
  content: z.string().trim().min(1, "내용을 입력해주세요.").max(300, "답글은 300자 이하로 입력해주세요."),
  password: z.string().min(4, "비밀번호는 4자 이상이어야 합니다.").max(72, "비밀번호가 너무 깁니다."),
  captchaToken: z.string().min(1, "캡차를 다시 확인해주세요."),
  captchaAnswer: z.union([z.string(), z.number()]),
});

export const replyUpdateSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요.").max(20, "이름은 20자 이하로 입력해주세요."),
  content: z.string().trim().min(1, "내용을 입력해주세요.").max(300, "답글은 300자 이하로 입력해주세요."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

export const adminLoginSchema = z.object({
  username: z.string().min(1, "아이디를 입력해주세요."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});
