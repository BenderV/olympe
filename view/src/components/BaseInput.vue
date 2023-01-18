<template>
  <base-field :name="name">
    <Field
      :name="name"
      :type="type"
      v-model="model"
      :placeholder="placeholder"
      class="block w-full max-w-lg rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      :rules="rules"
    />
    <ErrorMessage :name="name" class="sm:text-sm text-red-400" />
  </base-field>
</template>
<script setup lang="ts">
import BaseField from "../components/BaseField.vue";
// Name from props
import { defineProps, computed, defineEmits } from "vue";
import { configure, Field, Form, ErrorMessage, defineRule } from "vee-validate";
import { localize } from "@vee-validate/i18n";
import { required } from "@vee-validate/rules";

configure({
  generateMessage: localize({
    en: {
      messages: {
        required: "this field is required",
      },
    },
  }),
});

defineRule("required", required);

export interface Props {
  name: string;
  modelValue: string | number;
  placeholder?: string;
  rules?: string;
  type?: string;
}

const { name, placeholder, modelValue, type, rules } = withDefaults(
  defineProps<Props>(),
  {
    placeholder: "",
    type: "text",
    rules: "",
  }
);

const emit = defineEmits(["update:modelValue"]);

const model = computed({
  get: () => modelValue,
  set: (val) => emit("update:modelValue", val),
});
</script>
