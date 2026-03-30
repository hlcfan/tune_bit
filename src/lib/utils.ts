import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function clickOutside(node: HTMLElement, callback: () => void) {
	const handlePointerDown = (event: PointerEvent) => {
		if (!(event.target instanceof Node) || node.contains(event.target)) {
			return;
		}

		callback();
	};

	document.addEventListener('pointerdown', handlePointerDown, true);

	return {
		update(nextCallback: () => void) {
			callback = nextCallback;
		},
		destroy() {
			document.removeEventListener('pointerdown', handlePointerDown, true);
		}
	};
}

type PageSelectionOptions = {
	pageCount?: number;
};

function getPageSelectionFormatMessage() {
	return 'Use page numbers like 2,3,4 or ranges like 5-10.';
}

function parsePositivePageNumber(value: string) {
	if (!/^\d+$/.test(value)) {
		throw new Error(getPageSelectionFormatMessage());
	}

	const pageNumber = Number(value);

	if (!Number.isInteger(pageNumber) || pageNumber < 1) {
		throw new Error('Page numbers must start at 1.');
	}

	return pageNumber;
}

function validatePageNumber(pageNumber: number, pageCount?: number) {
	if (pageCount && pageNumber > pageCount) {
		throw new Error(`Page ${pageNumber} is outside this PDF. It only has ${pageCount} pages.`);
	}
}

export function parseSelectedPageNumbers(
	value: string,
	options: PageSelectionOptions = {}
): number[] | null {
	const normalizedValue = value.trim();

	if (!normalizedValue) {
		return null;
	}

	const segments = normalizedValue.split(',');

	if (segments.some((segment) => !segment.trim())) {
		throw new Error(getPageSelectionFormatMessage());
	}

	const selectedPages = new Set<number>();

	for (const segment of segments) {
		const normalizedSegment = segment.trim();
		const rangeMatch = normalizedSegment.match(/^(\d+)\s*-\s*(\d+)$/);

		if (rangeMatch) {
			const startPage = parsePositivePageNumber(rangeMatch[1]);
			const endPage = parsePositivePageNumber(rangeMatch[2]);

			if (endPage < startPage) {
				throw new Error('Page ranges must go from a lower page to a higher page.');
			}

			for (let pageNumber = startPage; pageNumber <= endPage; pageNumber += 1) {
				validatePageNumber(pageNumber, options.pageCount);
				selectedPages.add(pageNumber);
			}

			continue;
		}

		const pageNumber = parsePositivePageNumber(normalizedSegment);
		validatePageNumber(pageNumber, options.pageCount);
		selectedPages.add(pageNumber);
	}

	return Array.from(selectedPages).sort((leftPage, rightPage) => leftPage - rightPage);
}

export function getPageSelectionValidationMessage(
	value: string,
	options: PageSelectionOptions = {}
) {
	try {
		parseSelectedPageNumbers(value, options);
		return null;
	} catch (error) {
		return error instanceof Error ? error.message : getPageSelectionFormatMessage();
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
