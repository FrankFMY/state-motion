import CONFIG from "../__config.js";
import { EPS } from "../eps.js";

/**
 * Операции над циклическими углами. Каноническая единица — градусы.
 * Только `toRadians`, `toDegrees` и `toTrigone` явно переходят между единицами.
 */
class iAngle {
	/** Приводит угол в градусах к диапазону `[0, 360)`. */
	normalize(degrees: number): number {
		return ((degrees % 360) + 360) % 360;
	}

	/**
	 * Интерполирует угол по кратчайшей дуге.
	 *
	 * `factor` не ограничивается, результат всегда нормализован. Для ровных `180°`
	 * выбран отрицательный поворот: `0 → 180` идёт через `270`.
	 */
	lerp(current_degrees: number, target_degrees: number, factor: number): number {
		const delta_degrees = this.normalize(target_degrees - current_degrees + 180) - 180;
		return this.normalize(current_degrees + delta_degrees * factor);
	}

	/** Кратчайшее расстояние между углами в градусах, всегда `0…180`. */
	dist(current_degrees: number, target_degrees: number): number {
		return Math.abs(this.normalize(target_degrees - current_degrees + 180) - 180);
	}

	/** Сравнивает углы по кратчайшему расстоянию с допуском в градусах. */
	eq(current_degrees: number, target_degrees: number, eps_degrees: number = CONFIG.ANGLE_EQ_DEGREES_EPS): boolean {
		const float_error = Number.EPSILON * Math.max(1, Math.abs(current_degrees), Math.abs(target_degrees)) * 4;
		return EPS.eq(this.dist(current_degrees, target_degrees), 0, eps_degrees + float_error);
	}

}

export const Angle = new iAngle();
