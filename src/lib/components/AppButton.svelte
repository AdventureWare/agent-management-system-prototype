<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';

	type ButtonVariant =
		| 'primary'
		| 'neutral'
		| 'accent'
		| 'success'
		| 'warning'
		| 'danger'
		| 'ghost';
	type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

	let {
		children,
		href,
		type = 'button',
		variant = 'neutral',
		size = 'md',
		disabled = false,
		target,
		rel,
		form,
		formaction,
		title,
		ariaLabel,
		reserveLabel,
		name,
		value,
		onclick,
		onpointerdown,
		onpointerup,
		onpointercancel,
		onpointerleave,
		oncontextmenu,
		class: className = ''
	} = $props<{
		children?: Snippet;
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		variant?: ButtonVariant;
		size?: ButtonSize;
		disabled?: boolean;
		target?: string;
		rel?: string;
		form?: string;
		formaction?: string;
		title?: string;
		ariaLabel?: string;
		reserveLabel?: string;
		name?: string;
		value?: string;
		onclick?: ((event: MouseEvent) => void) | null;
		onpointerdown?: ((event: PointerEvent) => void) | null;
		onpointerup?: ((event: PointerEvent) => void) | null;
		onpointercancel?: ((event: PointerEvent) => void) | null;
		onpointerleave?: ((event: PointerEvent) => void) | null;
		oncontextmenu?: ((event: MouseEvent) => void) | null;
		class?: string;
	}>();

	let variantClass = $derived(`ui-button-${variant}`);
	let sizeClass = $derived(`ui-button-${size}`);
	let classes = $derived(['ui-button', variantClass, sizeClass, className]);
</script>

{#snippet content()}
	{#if reserveLabel}
		<span class="ui-button-content-stack">
			<span aria-hidden="true" class="ui-button-content-reserve">{reserveLabel}</span>
			<span class="ui-button-content-live">
				{@render children?.()}
			</span>
		</span>
	{:else}
		{@render children?.()}
	{/if}
{/snippet}

{#if href}
	<a
		class={classes}
		href={disabled ? undefined : resolve(href)}
		aria-disabled={disabled ? 'true' : undefined}
		tabindex={disabled ? -1 : undefined}
		{target}
		{rel}
		{title}
		aria-label={ariaLabel}
		onclick={onclick ?? undefined}
		onpointerdown={onpointerdown ?? undefined}
		onpointerup={onpointerup ?? undefined}
		onpointercancel={onpointercancel ?? undefined}
		onpointerleave={onpointerleave ?? undefined}
		oncontextmenu={oncontextmenu ?? undefined}
	>
		{@render content()}
	</a>
{:else}
	<button
		class={classes}
		{type}
		{disabled}
		{form}
		{formaction}
		{title}
		{name}
		{value}
		aria-label={ariaLabel}
		onclick={onclick ?? undefined}
		onpointerdown={onpointerdown ?? undefined}
		onpointerup={onpointerup ?? undefined}
		onpointercancel={onpointercancel ?? undefined}
		onpointerleave={onpointerleave ?? undefined}
		oncontextmenu={oncontextmenu ?? undefined}
	>
		{@render content()}
	</button>
{/if}
