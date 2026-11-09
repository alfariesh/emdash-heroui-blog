import { createBlogClient, parseSnippet, type ApiSearchResult, type SnippetSegment } from "@blog/shared";
import { Kbd, Modal, SearchField, Spinner } from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";
import { ArrowRight01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useId, useState, type KeyboardEvent, type MouseEvent } from "react";

const RESULT_LIMIT = 6;
const DEBOUNCE_MS = 160;

type Status = "idle" | "loading" | "done" | "error";

function resultHref(result: ApiSearchResult) {
	return `/${result.collection}/${result.slug}`;
}

function Highlighted({ segments }: { segments: SnippetSegment[] }) {
	return segments.map((segment, index) =>
		segment.highlight ? (
			<mark key={index} className="rounded-[3px] bg-accent-soft px-0.5 text-accent-soft-foreground">
				{segment.text}
			</mark>
		) : (
			segment.text
		),
	);
}

interface ResultRowProps {
	id: string;
	result: ApiSearchResult;
	isActive: boolean;
	onHover: () => void;
}

function ResultRow({ id, result, isActive, onHover }: ResultRowProps) {
	// The snippet is cut from the first indexed field, often the title: then its
	// highlights belong on the title instead of repeating it underneath.
	const segments = parseSnippet(result.snippet);
	const snippetIsTitle = segments.map((segment) => segment.text).join("") === result.title;

	return (
		<a
			id={id}
			href={resultHref(result)}
			role="option"
			aria-selected={isActive}
			tabIndex={-1}
			onMouseMove={onHover}
			className={cn("flex flex-col gap-0.5 rounded-xl px-3 py-2.5", isActive && "bg-default")}
		>
			<span className="flex items-baseline justify-between gap-3">
				<span className="truncate typography--body-sm typography--weight-medium text-foreground">
					{snippetIsTitle ? <Highlighted segments={segments} /> : result.title}
				</span>
				{result.collection === "pages" && <span className="shrink-0 typography--body-xs text-muted">Halaman</span>}
			</span>
			{!snippetIsTitle && segments.length > 0 && (
				<span className="line-clamp-2 typography--body-sm text-muted">
					<Highlighted segments={segments} />
				</span>
			)}
		</a>
	);
}

function Palette({ onClose }: { onClose: () => void }) {
	const listId = useId();
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<ApiSearchResult[]>([]);
	const [status, setStatus] = useState<Status>("idle");
	const [active, setActive] = useState(0);

	const q = query.trim();
	const allResultsHref = `/search?q=${encodeURIComponent(q)}`;
	const hrefs = results.length > 0 ? [...results.map(resultHref), allResultsHref] : [];
	const optionId = (index: number) => `${listId}-${index}`;

	useEffect(() => {
		if (!q) {
			setResults([]);
			setStatus("idle");
			return;
		}
		setStatus("loading");
		const controller = new AbortController();
		const timer = setTimeout(async () => {
			try {
				const page = await createBlogClient(window.location.origin).search(
					{ q, limit: RESULT_LIMIT },
					{ signal: controller.signal },
				);
				setResults(page.data);
				setActive(0);
				setStatus("done");
			} catch {
				if (!controller.signal.aborted) setStatus("error");
			}
		}, DEBOUNCE_MS);
		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	}, [q]);

	useEffect(() => {
		document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
	}, [listId, active]);

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Escape") {
			event.preventDefault();
			onClose();
		} else if (event.key === "Enter" && q) {
			event.preventDefault();
			// While new results load, the rows on screen are for an older query.
			window.location.assign(status === "done" ? (hrefs[active] ?? allResultsHref) : allResultsHref);
		} else if ((event.key === "ArrowDown" || event.key === "ArrowUp") && hrefs.length > 0) {
			event.preventDefault();
			const step = event.key === "ArrowDown" ? 1 : -1;
			setActive((index) => (index + step + hrefs.length) % hrefs.length);
		}
	};

	const message =
		status === "idle"
			? "Ketik untuk mencari judul dan isi tulisan."
			: status === "error"
				? "Pencarian gagal. Coba lagi sebentar lagi."
				: status === "done" && results.length === 0
					? `Tidak ada hasil untuk “${q}”.`
					: null;

	return (
		<>
			<SearchField
				aria-label="Cari tulisan"
				value={query}
				onChange={setQuery}
				fullWidth
				autoFocus
				className="border-b border-separator"
			>
				<SearchField.Group className="h-14 rounded-none border-0 bg-transparent px-1 shadow-none ring-0">
					<SearchField.SearchIcon>
						<HugeiconsIcon icon={Search01Icon} size={18} />
					</SearchField.SearchIcon>
					<SearchField.Input
						placeholder="Cari tulisan…"
						role="combobox"
						aria-expanded={hrefs.length > 0}
						aria-controls={listId}
						aria-autocomplete="list"
						aria-activedescendant={hrefs.length > 0 ? optionId(active) : undefined}
						className="typography--body"
						onKeyDown={onKeyDown}
					/>
					{status === "loading" ? <Spinner size="sm" className="me-2" /> : <SearchField.ClearButton />}
				</SearchField.Group>
			</SearchField>

			<div className="max-h-[min(26rem,60dvh)] overflow-y-auto p-2">
				<div id={listId} role="listbox" aria-label="Hasil pencarian">
					{results.map((result, index) => (
						<ResultRow
							key={`${result.collection}/${result.slug}`}
							id={optionId(index)}
							result={result}
							isActive={index === active}
							onHover={() => setActive(index)}
						/>
					))}
					{results.length > 0 && (
						<a
							id={optionId(results.length)}
							href={allResultsHref}
							role="option"
							aria-selected={active === results.length}
							tabIndex={-1}
							onMouseMove={() => setActive(results.length)}
							className={cn(
								"flex items-center justify-between rounded-xl px-3 py-2.5 typography--body-sm typography--weight-medium text-foreground",
								active === results.length && "bg-default",
							)}
						>
							Lihat semua hasil
							<HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" />
						</a>
					)}
				</div>
				{message && <p className="px-3 py-8 text-center typography--body-sm text-muted">{message}</p>}
				<p role="status" className="sr-only">
					{status === "done" ? `${results.length} hasil` : ""}
				</p>
			</div>

			<div className="hidden items-center gap-4 border-t border-separator px-4 py-2.5 typography--body-xs text-muted sm:flex">
				<span className="flex items-center gap-1.5">
					<Kbd>↑↓</Kbd> pilih
				</span>
				<span className="flex items-center gap-1.5">
					<Kbd>↵</Kbd> buka
				</span>
				<span className="flex items-center gap-1.5">
					<Kbd>esc</Kbd> tutup
				</span>
			</div>
		</>
	);
}

/**
 * Header search: a compact trigger and ⌘K / Ctrl+K command palette with live
 * results. The trigger is a link to /search, so it works before hydration.
 */
export default function SearchPalette() {
	const [isOpen, setOpen] = useState(false);
	const [isMac, setMac] = useState(true);

	useEffect(() => {
		setMac(/mac|iphone|ipad/i.test(navigator.platform));
		const onKeyDown = (event: globalThis.KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setOpen((open) => !open);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	const openPalette = (event: MouseEvent<HTMLAnchorElement>) => {
		// Leave ⌘-click and friends to the browser: they open /search in a new tab.
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		setOpen(true);
	};

	return (
		<>
			<a
				href="/search"
				aria-label="Cari"
				aria-keyshortcuts="Meta+K Control+K"
				onClick={openPalette}
				className={cn(
					buttonVariants({ variant: "ghost" }),
					"size-10 p-0 md:size-9 lg:w-44 lg:justify-start lg:gap-2 lg:bg-default lg:px-3 lg:text-muted lg:hover:text-foreground",
				)}
			>
				<HugeiconsIcon icon={Search01Icon} size={18} aria-hidden="true" />
				<span className="hidden typography--body-sm typography--weight-normal lg:inline">Cari…</span>
				<Kbd className="ms-auto hidden lg:inline-flex" aria-hidden="true">
					<Kbd.Content>{isMac ? "⌘" : "Ctrl"}</Kbd.Content>
					<Kbd.Content>K</Kbd.Content>
				</Kbd>
			</a>

			<Modal.Backdrop isOpen={isOpen} onOpenChange={setOpen} variant="blur">
				<Modal.Container placement="top" size="md">
					<Modal.Dialog aria-label="Cari tulisan" className="gap-0 overflow-hidden p-0">
						<Palette onClose={() => setOpen(false)} />
					</Modal.Dialog>
				</Modal.Container>
			</Modal.Backdrop>
		</>
	);
}
