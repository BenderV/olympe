import { createWebHistory, createRouter } from "vue-router";
import { authenticate } from "./stores/client";
import { loadQuery } from "./stores/query";
import { useDatabases } from "./stores/databases";
import Home from "./views/Home.vue";
import DatabaseList from "./views/DatabaseList.vue";
import Upload from "./views/Upload.vue";

function loadView(view: string) {
  return () => import(`./views/${view}.vue`);
}

const { fetchDatabases } = useDatabases();

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/upload",
    name: "Upload",
    component: Upload,
  },
  {
    path: "/query/:id",
    name: "Query",
    component: Home,
    beforeEnter: async (to) => {
      await loadQuery(to.params.id);
      return true;
    },
  },
  {
    path: "/databases",
    name: "DatabaseList",
    component: DatabaseList,
  },
  {
    path: "/databases/:id",
    name: "DatabaseEdit",
    component: loadView("DatabaseEdit"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  await authenticate();
  await fetchDatabases({ refresh: false });
  next();
});

export default router;
