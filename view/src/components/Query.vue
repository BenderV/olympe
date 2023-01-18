<template>
  <div id="editor">
    <div class="editor-wrapper">
      <AceEditor
        ref="editor"
        width="100%"
        height="200px"
        :min-lines="3"
        :font-size="16"
        :show-print-margin="true"
        :show-gutter="true"
        :highlight-active-line="true"
        mode="sql"
        theme="monokai"
        :on-change="updateCode"
        name="ace-editor"
        :enable-basic-autocompletion="true"
        :enable-live-autocompletion="true"
        :editor-props="{ $blockScrolling: true }"
        :commands="commands"
      />
      <button class="button is-primary is-rounded" @click="fetchResult(code)">
        <span class="icon">
          <i class="fa fa-play"></i>
        </span>
      </button>
    </div>
    <b-notification
      v-model:active="notificationIsActive"
      type="is-danger is-light"
      aria-close-label="Close notification"
      role="alert"
    >
      <pre>{{ error }}</pre>
    </b-notification>
    <Table
      v-if="!error && items.length"
      :items="items"
      :fields="fields"
    ></Table>
  </div>
</template>

<script>
import axios from "axios";
import { Ace as AceEditor } from "vue3-brace-editor";
import Table from "@/components/Table";

import "brace/mode/sql";
import "brace/theme/monokai";

export default {
  name: "Query",
  components: {
    AceEditor,
    Table,
  },
  data() {
    let self = this;
    return {
      error: null,
      code: "SELECT 1 FROM sales;",
      result: null,
      fields: [],
      items: [],
      commands: [
        {
          bindKey: { mac: "shift-enter", win: "shift-enter" },
          exec: self.updateEvent,
        },
        {
          bindKey: { mac: "cmd-enter", win: "cmd-enter" },
          exec: self.updateEvent,
        },
      ],
    };
  },
  computed: {
    notificationIsActive: {
      get: function () {
        return Boolean(this.error);
      },
      set: function (newValue) {
        if (newValue === false) {
          this.error = null;
        }
      },
    },
  },
  mounted() {
    this.$refs.editor.editor.setOption("minLines", 3);
    // this.$refs.aceeditor.editor.setAutoScrollEditorIntoView(true);
  },
  methods: {
    updateCode(code) {
      this.code = code;
    },
    updateEvent() {
      this.$set(this, "code", this.code.trim());
      this.fetchResult(this.code);
    },
    fetchResult(query) {
      let vm = this;
      axios
        .post("/api/query", { query: query })
        .then(function (response) {
          vm.items = response.data.preview;
          (vm.fields = response.data.order), (vm.error = null);
        })
        .catch(function (error) {
          if (error) {
            vm.error = error.response.data.error;
          }
        })
        .then(function () {
          vm.$emit("update", {
            query: query,
            items: vm.items,
            error: vm.error,
          });
        });
    },
  },
};
</script>

<style lang="scss">
@import "@/assets/style.scss";
$radius-rounded: 290486px !default;

.is-rounded {
  border-radius: $radius-rounded;
  padding-left: 1em !important;
  padding-right: 1em !important;
}

.editor-wrapper {
  position: relative;
  .button {
    position: absolute;
    bottom: 10px;
    right: 10px;
  }
}

.notification code,
.notification pre {
  background: inherit;
  padding: 0;
}

#editor .notification {
  border-radius: 0;
  margin-bottom: 0 !important;
}

.ace_gutter {
  padding-top: 10px;
}

.ace_scroller {
  padding-top: 10px;
}
</style>
