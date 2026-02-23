<template>
	<div class="aurora-bg" :class="{ 'aurora-paused': paused }">
		<div class="stars"></div>
		<div class="ribbon r1"></div>
		<div class="ribbon r2"></div>
		<div class="ribbon r3"></div>
		<div class="ribbon r4"></div>
		<div class="ribbon r5"></div>
		<div class="ribbon r6"></div>
	</div>
</template>

<script setup lang="ts">
/*
  AuroraBackground — GPU-composited aurora borealis effect.

  USAGE:
    Place inside any positioned container (position: relative).
    It fills its parent via position: absolute + inset: 0.
    Content above it just needs z-index >= 1.

    <div style="position: relative; overflow: hidden;">
      <AuroraBackground />
      <div style="position: relative; z-index: 1;">Your content</div>
    </div>

  PROPS:
    paused — freezes all animations (e.g. for accessibility / perf)
*/

interface Props {
	paused?: boolean
}

withDefaults(defineProps<Props>(), {
	paused: false,
})
</script>

<style scoped>
.aurora-bg {
	position: absolute;
	inset: 0;
	overflow: hidden;
	z-index: 0;
	pointer-events: none;
	background: linear-gradient(
		180deg,
		color-mix(in srgb, var(--bg-primary) 85%, #010d04) 0%,
		color-mix(in srgb, var(--bg-primary) 80%, #021a08) 20%,
		color-mix(in srgb, var(--bg-primary) 85%, #03120a) 50%,
		color-mix(in srgb, var(--bg-primary) 90%, #060e0a) 80%,
		var(--bg-primary) 100%
	);
}

.aurora-paused .ribbon,
.aurora-paused .stars {
	animation-play-state: paused !important;
}

/* Shared ribbon base */
.ribbon {
	position: absolute;
	width: 200%;
	left: -50%;
	border-radius: 50%;
	opacity: 0;
	will-change: transform, opacity;
	mix-blend-mode: screen;
	pointer-events: none;
}

/* ── Ribbon 1: Wide emerald sweep — upper third ── */
.r1 {
	top: 0%;
	height: 55%;
	background: radial-gradient(
		ellipse 80% 50% at 50% 50%,
		rgba(0, 255, 100, 0.18) 0%,
		rgba(0, 200, 80, 0.12) 25%,
		rgba(0, 140, 60, 0.06) 50%,
		transparent 75%
	);

	animation: drift-1 12s ease-in-out infinite;
}

/* ── Ribbon 2: Bright band — upper-mid ── */
.r2 {
	top: 20%;
	height: 35%;
	background: radial-gradient(
		ellipse 60% 40% at 50% 50%,
		rgba(100, 255, 160, 0.22) 0%,
		rgba(50, 230, 120, 0.14) 30%,
		rgba(0, 180, 80, 0.06) 60%,
		transparent 80%
	);

	animation: drift-2 10s ease-in-out infinite 1s;
}

/* ── Ribbon 3: Teal accent — center ── */
.r3 {
	top: 30%;
	height: 40%;
	background: radial-gradient(
		ellipse 70% 45% at 50% 50%,
		rgba(0, 220, 180, 0.15) 0%,
		rgba(0, 180, 140, 0.08) 35%,
		rgba(0, 120, 90, 0.04) 60%,
		transparent 80%
	);

	animation: drift-3 14s ease-in-out infinite 2.5s;
}

/* ── Ribbon 4: Deep green — lower half ── */
.r4 {
	top: 45%;
	height: 45%;
	background: radial-gradient(
		ellipse 90% 55% at 50% 50%,
		rgba(0, 160, 60, 0.12) 0%,
		rgba(0, 120, 50, 0.07) 30%,
		rgba(0, 80, 30, 0.03) 60%,
		transparent 80%
	);

	animation: drift-4 16s ease-in-out infinite 0.5s;
}

/* ── Ribbon 5: Lime highlight — lower-mid ── */
.r5 {
	top: 55%;
	height: 30%;
	background: radial-gradient(
		ellipse 50% 35% at 50% 50%,
		rgba(140, 255, 100, 0.16) 0%,
		rgba(80, 220, 60, 0.08) 40%,
		transparent 70%
	);

	animation: drift-5 11s ease-in-out infinite 3.5s;
}

/* ── Ribbon 6: Faint mint — full span ── */
.r6 {
	top: 90%;
	height: 80%;
	background: radial-gradient(
		ellipse 100% 60% at 50% 50%,
		rgba(150, 255, 200, 0.08) 0%,
		rgba(80, 200, 140, 0.04) 40%,
		transparent 70%
	);

	animation: drift-6 18s ease-in-out infinite 1.5s;
}

/* ── Star field ── */
.stars {
	position: absolute;
	inset: 0;
	background-image:
		radial-gradient(1px 1px at 10% 12%, rgba(255, 255, 255, 0.5), transparent),
		radial-gradient(1px 1px at 25% 28%, rgba(255, 255, 255, 0.3), transparent),
		radial-gradient(1px 1px at 40% 45%, rgba(255, 255, 255, 0.4), transparent),
		radial-gradient(1px 1px at 55% 62%, rgba(255, 255, 255, 0.3), transparent),
		radial-gradient(1px 1px at 70% 78%, rgba(255, 255, 255, 0.5), transparent),
		radial-gradient(1px 1px at 85% 88%, rgba(255, 255, 255, 0.2), transparent),
		radial-gradient(1px 1px at 15% 35%, rgba(255, 255, 255, 0.3), transparent),
		radial-gradient(1px 1px at 60% 52%, rgba(255, 255, 255, 0.4), transparent),
		radial-gradient(1px 1px at 90% 20%, rgba(255, 255, 255, 0.3), transparent),
		radial-gradient(1.5px 1.5px at 33% 70%, rgba(200, 255, 220, 0.6), transparent),
		radial-gradient(1.5px 1.5px at 78% 42%, rgba(200, 255, 220, 0.5), transparent);
	animation: twinkle 6s ease-in-out infinite alternate;
	pointer-events: none;
}

/*
  All animations use transform + opacity only.
  No layout/paint triggers — fully GPU composited.
*/

@keyframes drift-1 {
	0% {
		transform: translateX(-15%) translateY(0%) skewX(-4deg) scaleX(1) scaleY(1);
		opacity: 0.5;
	}
	20% {
		transform: translateX(-5%) translateY(-3%) skewX(6deg) scaleX(1.1) scaleY(0.9);
		opacity: 0.8;
	}
	40% {
		transform: translateX(10%) translateY(2%) skewX(-8deg) scaleX(0.9) scaleY(1.1);
		opacity: 0.6;
	}
	60% {
		transform: translateX(18%) translateY(-2%) skewX(5deg) scaleX(1.05) scaleY(0.95);
		opacity: 0.9;
	}
	80% {
		transform: translateX(5%) translateY(3%) skewX(-3deg) scaleX(0.95) scaleY(1.05);
		opacity: 0.7;
	}
	100% {
		transform: translateX(-15%) translateY(0%) skewX(-4deg) scaleX(1) scaleY(1);
		opacity: 0.5;
	}
}

@keyframes drift-2 {
	0% {
		transform: translateX(20%) translateY(0%) skewX(5deg) scaleX(1) scaleY(1);
		opacity: 0.4;
	}
	25% {
		transform: translateX(5%) translateY(-4%) skewX(-7deg) scaleX(1.15) scaleY(0.85);
		opacity: 0.85;
	}
	50% {
		transform: translateX(-15%) translateY(2%) skewX(8deg) scaleX(0.85) scaleY(1.15);
		opacity: 0.55;
	}
	75% {
		transform: translateX(-5%) translateY(-2%) skewX(-5deg) scaleX(1.1) scaleY(0.9);
		opacity: 0.8;
	}
	100% {
		transform: translateX(20%) translateY(0%) skewX(5deg) scaleX(1) scaleY(1);
		opacity: 0.4;
	}
}

@keyframes drift-3 {
	0% {
		transform: translateX(-10%) translateY(0%) skewX(-6deg) scaleX(1) scaleY(1);
		opacity: 0.3;
	}
	30% {
		transform: translateX(12%) translateY(-5%) skewX(9deg) scaleX(1.2) scaleY(0.8);
		opacity: 0.75;
	}
	60% {
		transform: translateX(-8%) translateY(3%) skewX(-7deg) scaleX(0.9) scaleY(1.1);
		opacity: 0.5;
	}
	100% {
		transform: translateX(-10%) translateY(0%) skewX(-6deg) scaleX(1) scaleY(1);
		opacity: 0.3;
	}
}

@keyframes drift-4 {
	0% {
		transform: translateX(8%) translateY(0%) skewX(3deg) scaleX(1) scaleY(1);
		opacity: 0.4;
	}
	35% {
		transform: translateX(-12%) translateY(-4%) skewX(-8deg) scaleX(1.1) scaleY(0.9);
		opacity: 0.7;
	}
	65% {
		transform: translateX(15%) translateY(3%) skewX(6deg) scaleX(0.9) scaleY(1.1);
		opacity: 0.5;
	}
	100% {
		transform: translateX(8%) translateY(0%) skewX(3deg) scaleX(1) scaleY(1);
		opacity: 0.4;
	}
}

@keyframes drift-5 {
	0% {
		transform: translateX(-20%) translateY(0%) skewX(-5deg) scaleX(1);
		opacity: 0.3;
	}
	30% {
		transform: translateX(0%) translateY(-3%) skewX(7deg) scaleX(1.2);
		opacity: 0.7;
	}
	50% {
		transform: translateX(15%) translateY(2%) skewX(-9deg) scaleX(0.85);
		opacity: 0.9;
	}
	70% {
		transform: translateX(5%) translateY(-2%) skewX(4deg) scaleX(1.1);
		opacity: 0.5;
	}
	100% {
		transform: translateX(-20%) translateY(0%) skewX(-5deg) scaleX(1);
		opacity: 0.3;
	}
}

@keyframes drift-6 {
	0% {
		transform: translateX(5%) translateY(0%) skewX(2deg) scaleX(1);
		opacity: 0.2;
	}
	33% {
		transform: translateX(-5%) translateY(-3%) skewX(-6deg) scaleX(1.1);
		opacity: 0.4;
	}
	66% {
		transform: translateX(-10%) translateY(2%) skewX(5deg) scaleX(1.15);
		opacity: 0.5;
	}
	100% {
		transform: translateX(5%) translateY(0%) skewX(2deg) scaleX(1);
		opacity: 0.2;
	}
}

@keyframes twinkle {
	0% {
		opacity: 0.6;
	}
	100% {
		opacity: 1;
	}
}
</style>
