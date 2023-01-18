<template>
  <div class="mt-1 rounded-md p-4" :class="colorClass('bg', 50)">
    <div class="flex">
      <div class="flex-shrink-0">
        <iconComponent
          class="h-5 w-5"
          :class="colorClass('text', 400)"
          aria-hidden="true"
        />
      </div>
      <div class="flex-grow ml-3">
        <p class="text-sm font-medium" :class="colorClass('text', 800)">
          {{ title }}
        </p>
        <div class="mt-2 text-sm" :class="colorClass('text', 700)">
          <div
            v-if="progress >= 0"
            class="mx-auto block h-2 relative max-w-xl rounded-full overflow-hidden"
          >
            <div
              class="w-full h-full absolute"
              :class="colorClass('bg', 200)"
            ></div>
            <div
              id="bar"
              class="h-full relative w-0"
              :style="{ width: progress + '%' }"
              :class="colorClass('bg', 500)"
            ></div>
          </div>
        </div>
        <div
          v-if="message"
          class="mt-2 text-sm"
          :class="colorClass('text', 700)"
        >
          <p class="mt-2">{{ message }}</p>
        </div>
      </div>
      <div class="ml-auto pl-3" v-if="displayClose">
        <div class="-mx-1.5 -my-1.5">
          <button
            @click="handleClose"
            type="button"
            class="inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2"
            :class="[
              colorClass('bg', 50),
              colorClass('text', 500),
              colorClass('hover:bg', 100),
              colorClass('focus:ring-offset', 50),
              colorClass('focus:ring', 600),
            ]"
          >
            <span class="sr-only">Dismiss</span>
            <XIcon class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import {
  CloudUploadIcon,
  CheckCircleIcon,
  XIcon,
  XCircleIcon,
} from "@heroicons/vue/solid";
import { computed } from "vue";

const props = defineProps({
  color: {
    type: String,
    default: "blue",
  },
  title: {
    type: String,
    default: "Uploading file... (15%)",
  },
  message: {
    type: String,
  },
  progress: {
    type: Number,
    default: -1,
  },
  displayClose: {
    type: Boolean,
    default: false,
  },
});

const colorClass = (type, intensity) => {
  // Only for tailwind...
  const colorsForTailwind = [
    "bg-red-50",
    "bg-red-200",
    "bg-red-500",
    "hover:bg-red-100",
    "bg-blue-50",
    "bg-blue-200",
    "bg-blue-500",
    "hover:bg-blue-100",
    "bg-green-50",
    "bg-green-200",
    "bg-green-500",
    "hover:bg-green-100",
    "text-red-400",
    "text-red-500",
    "text-red-700",
    "text-red-800",
    "focus:ring-offset-red-50",
    "focus:ring-red-600",
    "text-blue-400",
    "text-blue-500",
    "text-blue-700",
    "text-blue-800",
    "focus:ring-offset-blue-50",
    "focus:ring-blue-600",
    "text-green-400",
    "text-green-500",
    "text-green-700",
    "text-green-800",
    "focus:ring-offset-green-50",
    "focus:ring-green-600",
  ];
  return `${type}-${props.color}-${intensity}`;
};

const iconComponent = computed(() => {
  if (props.color == "green") return CheckCircleIcon;
  else if (props.color == "red") return XCircleIcon;
  else return CloudUploadIcon;
});

const emits = defineEmits(["close"]);

const handleClose = () => {
  console.log("handleClose");
  emits("close");
};
</script>
