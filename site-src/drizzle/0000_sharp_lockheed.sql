CREATE TABLE `attendance` (
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`rsvp` text NOT NULL,
	`outcome` text,
	`confirmation` text DEFAULT 'pending' NOT NULL,
	`updated` integer NOT NULL,
	PRIMARY KEY(`event_id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `attendance_user` ON `attendance` (`user_id`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`place` text NOT NULL,
	`starts` integer NOT NULL,
	`created` integer NOT NULL,
	`canceled` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `friends` (
	`id` text PRIMARY KEY NOT NULL,
	`sender` text NOT NULL,
	`recipient` text NOT NULL,
	`status` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `friends_sender` ON `friends` (`sender`);--> statement-breakpoint
CREATE INDEX `friends_recipient` ON `friends` (`recipient`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_code_unique` ON `profiles` (`code`);--> statement-breakpoint
CREATE TABLE `walks` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`payload` text NOT NULL,
	`updated` integer NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
