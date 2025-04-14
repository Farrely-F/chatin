CREATE TYPE "public"."answer_preference" AS ENUM('short', 'moderate', 'long');--> statement-breakpoint
CREATE TYPE "public"."default_language" AS ENUM('english', 'indonesia');--> statement-breakpoint
CREATE TYPE "public"."emoji_usage" AS ENUM('never', 'normal', 'frequent');--> statement-breakpoint
CREATE TYPE "public"."formality" AS ENUM('friendly', 'neutral', 'formal');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('male', 'female', 'neutral');