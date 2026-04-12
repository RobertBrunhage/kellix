import type { APIRoute } from 'astro';
import { ImageResponse } from '@vercel/og';
import { createElement as h } from 'react';

export const prerender = false;

function panel(label: string, value: string, accent?: boolean) {
	return h(
		'div',
		{
			style: {
				display: 'flex',
				flexDirection: 'column',
				gap: '10px',
				padding: '24px 28px',
				borderRadius: '24px',
				background: accent ? 'rgba(5, 10, 19, 0.68)' : 'rgba(255, 255, 255, 0.06)',
				border: accent
					? '1px solid rgba(120, 240, 203, 0.24)'
					: '1px solid rgba(255, 255, 255, 0.12)',
			},
		},
		h(
			'div',
			{
				style: {
					display: 'flex',
					fontSize: '18px',
					fontWeight: 700,
					letterSpacing: '0.18em',
					textTransform: 'uppercase',
					color: 'rgba(245, 247, 251, 0.58)',
				},
			},
			label,
		),
		h(
			'div',
			{
				style: {
					display: 'flex',
					fontSize: '28px',
					color: accent ? '#dffef3' : '#f5f7fb',
				},
			},
			value,
		),
	);
}

export const GET: APIRoute = ({ request }) => {
	const url = new URL(request.url);
	const title = url.searchParams.get('title') ?? 'Kellix';
	const subtitle =
		url.searchParams.get('subtitle') ??
		'Track calories, workouts, goals, and routines with your own Telegram assistant.';

	return new ImageResponse(
		h(
			'div',
			{
				style: {
					width: '100%',
					height: '100%',
					display: 'flex',
					position: 'relative',
					background:
						'radial-gradient(circle at top right, rgba(79, 140, 255, 0.34), transparent 32%), radial-gradient(circle at bottom left, rgba(120, 240, 203, 0.22), transparent 26%), linear-gradient(180deg, #0c1930 0%, #04070d 100%)',
					color: '#f5f7fb',
					fontFamily: 'Noto Sans',
					padding: '24px',
				},
			},
			h('div', {
				style: {
					position: 'absolute',
					inset: '24px',
					borderRadius: '28px',
					border: '1px solid rgba(245, 247, 251, 0.12)',
				},
			}),
			h(
				'div',
				{
					style: {
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'space-between',
						width: '100%',
						padding: '56px 64px',
					},
				},
				h(
					'div',
					{ style: { display: 'flex', flexDirection: 'column' } },
					h(
						'div',
						{
							style: {
								display: 'flex',
								fontSize: '28px',
								fontWeight: 700,
								letterSpacing: '0.3em',
								textTransform: 'uppercase',
								color: '#78f0cb',
							},
						},
						'Kellix',
					),
					h(
						'div',
						{
							style: {
								display: 'flex',
								marginTop: '44px',
								maxWidth: '960px',
								fontSize: '76px',
								lineHeight: 1,
								fontWeight: 700,
								letterSpacing: '-0.06em',
							},
						},
						title,
					),
					h(
						'div',
						{
							style: {
								display: 'flex',
								marginTop: '28px',
								maxWidth: '980px',
								fontSize: '32px',
								lineHeight: 1.35,
								color: 'rgba(245, 247, 251, 0.82)',
							},
						},
						subtitle,
					),
				),
				h(
					'div',
					{ style: { display: 'flex', gap: '20px' } },
					panel('Use cases', 'Calories, workouts, weight, goals'),
					panel('Chat', 'Telegram-first', true),
				),
			),
		),
		{
			width: 1200,
			height: 630,
			headers: {
				'Cache-Control': 'public, max-age=3600',
			},
		},
	);
};
