// static/js/app.js
// Main entry point for Vue 3 application.
// Configures Vue Router with hash mode, navigation guards, and mounts root instance.

const routes = [
    { path: "/", redirect: () => {
        if (!window.API.isLoggedIn()) return "/login";
        const role = window.API.getUser().role;
        if (role === "admin") return "/admin/dashboard";
        if (role === "examiner") return "/examiner/dashboard";
        return "/student/dashboard";
    }},
    { path: "/login", component: window.Login },
    { path: "/register", component: window.Register },

    // Admin Routes
    { path: "/admin/dashboard", component: window.AdminDashboard, meta: { role: "admin" } },
    { path: "/admin/courses", component: window.AdminCourses || window.AdminDashboard, meta: { role: "admin" } },
    { path: "/admin/exams", component: window.AdminExams || window.AdminDashboard, meta: { role: "admin" } },
    { path: "/admin/examiners", component: window.AdminExaminers || window.AdminDashboard, meta: { role: "admin" } },
    { path: "/admin/students", component: window.AdminStudents || window.AdminDashboard, meta: { role: "admin" } },
    { path: "/admin/slots", component: window.AdminSlots || window.AdminDashboard, meta: { role: "admin" } },
    { path: "/admin/bookings", component: window.AdminBookings || window.AdminDashboard, meta: { role: "admin" } },

    // Examiner Routes
    { path: "/examiner/dashboard", component: window.ExaminerDashboard, meta: { role: "examiner" } },
    { path: "/examiner/exams", component: window.ExaminerExams || window.ExaminerDashboard, meta: { role: "examiner" } },
    { path: "/examiner/slots", component: window.ExaminerSlots || window.ExaminerDashboard, meta: { role: "examiner" } },
    { path: "/examiner/evaluate/:bookingId", component: window.ExaminerEvaluate || window.ExaminerDashboard, meta: { role: "examiner" } },

    // Student Routes
    { path: "/student/dashboard", component: window.StudentDashboard, meta: { role: "student" } },
    { path: "/student/exams", component: window.StudentExams || window.StudentDashboard, meta: { role: "student" } },
    { path: "/student/history", component: window.StudentHistory || window.StudentDashboard, meta: { role: "student" } },
    { path: "/student/profile", component: window.StudentProfile || window.StudentDashboard, meta: { role: "student" } },

    // Fallback
    { path: "/:pathMatch(.*)*", redirect: "/" }
];

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes
});

// Navigation guard to enforce authentication and role permissions
router.beforeEach((to, from, next) => {
    const isLoggedIn = window.API.isLoggedIn();
    const userRole = window.API.getUser().role;

    if (to.path === "/login" || to.path === "/register") {
        if (isLoggedIn) {
            if (userRole === "admin") return next("/admin/dashboard");
            if (userRole === "examiner") return next("/examiner/dashboard");
            if (userRole === "student") return next("/student/dashboard");
        }
        return next();
    }

    if (!isLoggedIn) {
        return next("/login");
    }

    if (to.meta && to.meta.role && to.meta.role !== userRole) {
        if (userRole === "admin") return next("/admin/dashboard");
        if (userRole === "examiner") return next("/examiner/dashboard");
        if (userRole === "student") return next("/student/dashboard");
        return next("/login");
    }

    next();
});

const app = Vue.createApp({
    data() {
        return {
            searchQuery: ""
        };
    },
    methods: {
        onSearch(q) {
            this.searchQuery = q;
        },
        onLogout() {
            window.API.clearAuth();
            this.$router.push("/login");
        }
    }
});

app.component("navbar", window.Navbar);
app.use(router);
app.mount("#app");
