<template>
	<div v-if="!dismissed" class="boot-splash" @animationend="onAnimationEnd">
		<div class="mountains-container">
			<div class="mountain-layer --back"></div>
			<div class="mountain-layer --mid"></div>
			<div class="mountain-layer --front"></div>
			<div class="flame-sweep"></div>
		</div>

		<div class="logo-flash">
			<img src="/ForgeTextLogo.png" alt="ForgeAudio" />
		</div>

		<div class="dissolve-columns">
			<div
				v-for="col in columns"
				:key="col.index"
				class="column"
				:style="{
					'--i': col.index,
					'--jitter': col.jitter + 'ms',
					'--drop-dur': col.durationVar + 's',
				}"
			></div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"

const emit = defineEmits<{
	done: []
}>()

const dismissed = ref(false)

const columns = Array.from({ length: 24 }, (_, i) => ({
	index: i,
	jitter: Math.random() * 64,
	durationVar: 0.48 + Math.random() * 0.4,
}))

function onAnimationEnd(e: AnimationEvent) {
	if (e.animationName === "fadeOut") {
		dismissed.value = true
		emit("done")
	}
}

onMounted(() => {
	// Safety timeout (20% faster)
	setTimeout(() => {
		if (!dismissed.value) {
			dismissed.value = true
			emit("done")
		}
	}, 7600)
})
</script>

<style scoped>
.boot-splash {
	position: fixed;
	inset: 0;
	z-index: 10000;
	background: var(--bg-primary);
	pointer-events: none;

	/* Overall fade-out (20% faster) */
	animation: fadeOut 0.4s ease-out 6.72s forwards;

	--mtn-back: color-mix(in srgb, var(--accent) 30%, black);
	--mtn-mid: color-mix(in srgb, var(--accent) 50%, black);
	--mtn-front: color-mix(in srgb, var(--accent) 70%, black);
	--mtn-back-light: color-mix(in srgb, var(--accent) 40%, black);
	--mtn-mid-light: color-mix(in srgb, var(--accent) 60%, black);
	--mtn-front-light: color-mix(in srgb, var(--accent) 80%, black);
	--flame-hot: color-mix(in srgb, var(--accent) 60%, #ff6600);
	--flame-warm: color-mix(in srgb, var(--accent) 80%, #ffaa00);
}

/* ── Mountains ── */

.mountains-container {
	position: absolute;
	inset: 0;
	overflow: hidden;
}

.mountain-layer {
	position: absolute;
	bottom: 0;
	width: 100%;
	height: 60%;
	opacity: 0;
	transform: translateY(20px);
}

/* Mountains slide off screen near the end */
.mountain-layer.--back {
	background: linear-gradient(to bottom, var(--mtn-back), var(--mtn-back-light));
	clip-path: polygon(
		0% 100%,
		0% 65%,
		8% 48%,
		18% 55%,
		28% 35%,
		38% 50%,
		48% 28%,
		58% 45%,
		68% 32%,
		78% 52%,
		88% 40%,
		100% 55%,
		100% 100%
	);
	animation:
		mountainsIn 0.32s ease-out 0s forwards,
		mountainsOff 1.28s ease-in 5.52s forwards;
}

.mountain-layer.--mid {
	background: linear-gradient(to bottom, var(--mtn-mid), var(--mtn-mid-light));
	clip-path: polygon(
		0% 100%,
		0% 72%,
		10% 58%,
		20% 65%,
		30% 45%,
		40% 60%,
		50% 42%,
		60% 55%,
		70% 48%,
		80% 62%,
		90% 50%,
		100% 68%,
		100% 100%
	);
	animation:
		mountainsIn 0.32s ease-out 0.08s forwards,
		mountainsOff 1.28s ease-in 5.6s forwards;
}

.mountain-layer.--front {
	background: linear-gradient(to bottom, var(--mtn-front), var(--mtn-front-light));
	clip-path: polygon(
		0% 100%,
		0% 78%,
		6% 68%,
		14% 72%,
		22% 58%,
		32% 70%,
		42% 55%,
		52% 65%,
		62% 52%,
		72% 66%,
		82% 60%,
		92% 72%,
		100% 65%,
		100% 100%
	);
	animation:
		mountainsIn 0.32s ease-out 0.16s forwards,
		mountainsOff 1.28s ease-in 5.68s forwards;
}

@keyframes mountainsIn {
	from {
		opacity: 0;
		transform: translateY(20px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

/* Slide mountains down and off screen at end */
@keyframes mountainsOff {
	0% {
		transform: translateY(0);
		opacity: 1;
		filter: blur(0px);
	}
	70% {
		opacity: 0.9;
	}
	100% {
		transform: translateY(120vh);
		opacity: 0;
		filter: blur(2px);
	}
}

/* ── Logo Flash ── */

.logo-flash {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	opacity: 0;
	z-index: 200;
	animation: logoFlash 4.8s ease-in-out 2.4s forwards;
	filter: drop-shadow(0 0 0px transparent);
}

.logo-flash img {
	height: 60px;
	width: auto;
	display: block;
}

@keyframes logoFlash {
	0% {
		opacity: 0;
		transform: translate(-50%, -50%) scale(1.95); /* original value */
		filter: drop-shadow(0 0 0px transparent);
	}
	30% {
		opacity: 1;
		transform: translate(-50%, -50%) scale(2.05); /* original value */
		filter: drop-shadow(0 0 20px var(--accent));
	}
	70% {
		opacity: 1;
		transform: translate(-50%, -50%) scale(2.5); /* original value */
		filter: drop-shadow(0 0 12px var(--accent));
	}
	100% {
		opacity: 0;
		transform: translate(-50%, -50%) scale(2); /* original value */
		filter: drop-shadow(0 0 0px transparent);
	}
}

/* ── Flame Sweep ── */

/* .flame-sweep {
	position: absolute;
	inset: 0;
	opacity: 0;
	animation: flameSweepFade 0.8s ease-in-out 3.2s forwards;
}

.flame-sweep::after {
	content: "";
	position: absolute;
	inset: 0;
	background: linear-gradient(90deg, var(--flame-hot), transparent 40%, var(--flame-warm) 70%, transparent);
	background-size: 300% 100%;
	background-position: -100% 0;
	mix-blend-mode: screen;
	animation: flameSweep 0.8s ease-in-out 3.2s forwards;
} */

/* @keyframes flameSweepFade {
	0% {
		opacity: 0;
	}
	10% {
		opacity: 1;
	}
	90% {
		opacity: 1;
	}
	100% {
		opacity: 0;
	}
}

@keyframes flameSweep {
	from {
		background-position: -100% 0;
	}
	to {
		background-position: 200% 0;
	}
} */

/* ── Dissolve Columns ── */

.dissolve-columns {
	position: absolute;
	inset: 0;
	opacity: 0;
	animation: dissolveIn 4.8s ease-out 3.04s forwards;
}

@keyframes dissolveIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

.column {
	position: absolute;
	width: calc(100% / 24);
	height: 100%;
	top: 0;
	left: calc(var(--i) * (100% / 24));
	background: linear-gradient(to bottom, var(--mtn-back), var(--mtn-mid) 40%, var(--mtn-front) 70%, var(--bg-primary));
	animation: columnDrop var(--drop-dur) ease-in calc(5.76s + var(--i) * 24ms + var(--jitter)) forwards;
}

@keyframes columnDrop {
	0% {
		transform: translateY(0);
		opacity: 1;
	}
	60% {
		opacity: 0.6;
	}
	100% {
		transform: translateY(120vh);
		opacity: 0;
	}
}

/* ── Final Fade Out ── */

@keyframes fadeOut {
	from {
		opacity: 1;
	}
	to {
		opacity: 0;
	}
}

/* ── Reduced Motion ── */

@media (prefers-reduced-motion: reduce) {
	.boot-splash {
		animation: fadeOut 0.3s ease-out 0.3s forwards;
	}

	.boot-splash * {
		animation: none !important;
	}
}
</style>
