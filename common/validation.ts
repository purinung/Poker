/**
 * Centralized validation utilities for the poker application
 * Provides input sanitization and validation functions
 */

import { VALIDATION_CONFIG } from "./constant"
import { PlayerActionEnum } from "./enum"
import { UI_LABELS } from "./label"

export interface ValidationResult {
	isValid: boolean
	error?: string
	sanitizedValue?: any
}

export class InputValidator {
	/**
	 * Sanitizes and validates a string input
	 */
	static validateString(
		value: unknown,
		minLength: number = 1,
		maxLength: number = VALIDATION_CONFIG.MAX_INPUT_LENGTH,
		fieldName: string = "input",
	): ValidationResult {
		if (typeof value !== "string") {
			return {
				isValid: false,
				error: `${fieldName} must be a string`,
			}
		}

		const trimmed = value.trim()

		if (trimmed.length < minLength) {
			return {
				isValid: false,
				error: `${fieldName} must be at least ${minLength} characters`,
			}
		}

		if (trimmed.length > maxLength) {
			return {
				isValid: false,
				error: `${fieldName} cannot exceed ${maxLength} characters`,
			}
		}

		// Basic XSS protection - remove dangerous characters
		const sanitized = trimmed.replace(/[<>\"'&]/g, "")

		return {
			isValid: true,
			sanitizedValue: sanitized,
		}
	}

	/**
	 * Validates username
	 */
	static validateUsername(username: unknown): ValidationResult {
		return InputValidator.validateString(
			username,
			VALIDATION_CONFIG.USERNAME_MIN_LENGTH,
			VALIDATION_CONFIG.USERNAME_MAX_LENGTH,
			UI_LABELS.USERNAME,
		)
	}

	/**
	 * Validates password
	 */
	static validatePassword(password: unknown): ValidationResult {
		return InputValidator.validateString(
			password,
			VALIDATION_CONFIG.PASSWORD_MIN_LENGTH,
			undefined,
			UI_LABELS.PASSWORD,
		)
	}

	/**
	 * Validates room name
	 */
	static validateRoomName(roomName: unknown): ValidationResult {
		return InputValidator.validateString(
			roomName,
			VALIDATION_CONFIG.ROOM_NAME_MIN_LENGTH,
			VALIDATION_CONFIG.ROOM_NAME_MAX_LENGTH,
			UI_LABELS.ROOM_NAME,
		)
	}

	/**
	 * Validates numeric input
	 */
	static validateNumber(
		value: unknown,
		min: number = VALIDATION_CONFIG.MIN_NUMERIC_VALUE,
		max: number = VALIDATION_CONFIG.MAX_NUMERIC_VALUE,
		fieldName: string = "value",
	): ValidationResult {
		const num = Number(value)

		if (isNaN(num)) {
			return {
				isValid: false,
				error: `${fieldName} must be a valid number`,
			}
		}

		if (num < min) {
			return {
				isValid: false,
				error: `${fieldName} must be at least ${min}`,
			}
		}

		if (num > max) {
			return {
				isValid: false,
				error: `${fieldName} cannot exceed ${max}`,
			}
		}

		return {
			isValid: true,
			sanitizedValue: num,
		}
	}

	/**
	 * Validates player ID
	 */
	static validatePlayerId(playerId: unknown): ValidationResult {
		if (!playerId || typeof playerId !== "string") {
			return {
				isValid: false,
				error: "Player ID is required and must be a string",
			}
		}

		return {
			isValid: true,
			sanitizedValue: playerId.trim(),
		}
	}

	/**
	 * Validates room ID
	 */
	static validateRoomId(roomId: unknown): ValidationResult {
		if (!roomId || typeof roomId !== "string") {
			return {
				isValid: false,
				error: "Room ID is required and must be a string",
			}
		}

		return {
			isValid: true,
			sanitizedValue: roomId.trim(),
		}
	}

	/**
	 * Validates player action type
	 */
	static validateActionType(actionType: unknown): ValidationResult {
		if (!actionType || typeof actionType !== "string") {
			return {
				isValid: false,
				error: "Action type is required and must be a string",
			}
		}

		const validActions = Object.values(PlayerActionEnum)
		if (!validActions.includes(actionType as PlayerActionEnum)) {
			return {
				isValid: false,
				error: `Invalid action type. Must be one of: ${validActions.join(", ")}`,
			}
		}

		return {
			isValid: true,
			sanitizedValue: actionType,
		}
	}

	/**
	 * Validates bet amount
	 */
	static validateBetAmount(amount: unknown): ValidationResult {
		if (amount === undefined || amount === null) {
			return {
				isValid: true,
				sanitizedValue: undefined,
			}
		}

		return InputValidator.validateNumber(amount, 0, 1000000, "Bet amount")
	}

	/**
	 * Validates request body for common required fields
	 */
	static validateRequestBody(
		body: any,
		requiredFields: string[],
	): ValidationResult {
		if (!body || typeof body !== "object") {
			return {
				isValid: false,
				error: "Request body is required",
			}
		}

		for (const field of requiredFields) {
			if (!(field in body)) {
				return {
					isValid: false,
					error: `Required field '${field}' is missing`,
				}
			}
		}

		return {
			isValid: true,
			sanitizedValue: body,
		}
	}

	/**
	 * Sanitizes HTML to prevent XSS
	 */
	static sanitizeHtml(input: string): string {
		return input
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#x27;")
			.replace(/\//g, "&#x2F;")
	}

	/**
	 * Validates and sanitizes JSON input
	 */
	static validateJson(input: unknown): ValidationResult {
		if (typeof input === "string") {
			try {
				const parsed = JSON.parse(input)
				return {
					isValid: true,
					sanitizedValue: parsed,
				}
			} catch (error) {
				return {
					isValid: false,
					error: "Invalid JSON format",
				}
			}
		}

		if (typeof input === "object" && input !== null) {
			return {
				isValid: true,
				sanitizedValue: input,
			}
		}

		return {
			isValid: false,
			error: "Input must be valid JSON",
		}
	}
}
