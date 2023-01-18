<template>
  <div class="grid grid-cols-12 gap-4 px-4 mx-auto">
    <div class="col-span-3">
      <DatabaseExplorer></DatabaseExplorer>
    </div>
    <div class="col-span-9">
      <BaseQuery :database="databaseSelected" />
      <BaseAlert v-if="queryError">
        <template #title> There is an error in the SQL execution 😔 </template>
        {{ queryError }}
      </BaseAlert>
      <BaseBuilder
        v-if="queryResults !== null"
        :context="queryText"
        :data="queryResults"
      ></BaseBuilder>
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseBuilder from "@/components/BaseBuilder.vue";
import BaseQuery from "@/components/BaseQuery.vue";
import { queryResults, queryText, queryError } from "../stores/query";
import { useDatabases } from "../stores/databases";
import BaseAlert from "../components/BaseAlert.vue";
import DatabaseExplorer from "../components/DatabaseExplorer.vue";

const { databaseSelected } = await useDatabases();
</script>
