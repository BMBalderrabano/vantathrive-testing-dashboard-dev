import { forbidden, notFound } from "next/navigation";

type ActionFailure = {
    success: false;
    status: number;
    error: string;
};

type ActionSuccess<T> = {
    success: true;
    data: T;
};

type ActionResult<T> = ActionSuccess<T> | ActionFailure;

export function resolveActionResult<T>(result: ActionResult<T>): T {
    if (result.success) {
        return result.data;
    }

    if (process.env.NODE_ENV === "development") {
        console.error(result);
    }

    switch (result.status) {
        case 404:
            notFound();
        case 403:
            forbidden();
        case 400:
            throw new Error("Something went wrong. Please try again later.");
        default:
            throw new Error("Something went wrong. Please try again later.");
    }
}
