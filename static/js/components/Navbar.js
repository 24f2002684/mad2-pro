// static/js/components/Navbar.js
// Navigation bar component adapting dynamically to user role.
// Provides role-specific navigation links, shared search box, and logout action.

const Navbar = {
    props: ["searchQuery"],
    emits: ["update:searchQuery", "logout"],
    data() {
        return {
            query: this.searchQuery || ""
        };
    },
    computed: {
        isLoggedIn() {
            return window.API.isLoggedIn();
        },
        user() {
            return window.API.getUser();
        },
        role() {
            return this.user.role;
        },
        currentRoute() {
            return this.$route.path;
        },
        showSearch() {
            // Show search bar on list views
            const searchableRoutes = [
                "/admin/courses", "/admin/exams", "/admin/examiners", "/admin/students", "/admin/bookings",
                "/examiner/exams", "/examiner/slots",
                "/student/exams"
            ];
            return searchableRoutes.includes(this.currentRoute);
        }
    },
    watch: {
        query(newVal) {
            this.$emit("update:searchQuery", newVal);
        },
        $route() {
            // Reset query when route changes
            this.query = "";
            this.$emit("update:searchQuery", "");
        }
    },
    methods: {
        handleLogout() {
            this.$emit("logout");
        }
    },
    template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
        <div class="container-fluid px-4">
            <router-link class="navbar-brand fw-bold" to="/">
                <i class="bi bi-mortarboard-fill me-2"></i>EMP-V2
            </router-link>
            
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
                <span class="navbar-toggler-icon"></span>
            </button>

            <div class="collapse navbar-collapse" id="navMenu">
                <!-- Navigation links for Admin -->
                <ul class="navbar-nav me-auto mb-2 mb-lg-0" v-if="isLoggedIn && role === 'admin'">
                    <li class="nav-item">
                        <router-link class="nav-link" active-class="active" to="/admin/dashboard">Home</router-link>
                    </li>
                    <li class="nav-item">
                        <router-link class="nav-link" active-class="active" to="/admin/courses">Courses</router-link>
                    </li>
                    <li class="nav-item">
                        <router-link class="nav-link" active-class="active" to="/admin/exams">Examinations</router-link>
                    </li>
                    <li class="nav-item">
                        <router-link class="nav-link" active-class="active" to="/admin/examiners">Examiners</router-link>
                    </li>
                    <li class="nav-item">
                        <router-link class="nav-link" active-class="active" to="/admin/students">Students</router-link>
                    </li>
                    <li class="nav-item">
                        <router-link class="nav-link" active-class="active" to="/admin/bookings">Bookings</router-link>
                    </li>
                </ul>

                <!-- Navigation links for Examiner -->
                <ul class="navbar-nav me-auto mb-2 mb-lg-0" v-else-if="isLoggedIn && role === 'examiner'">
                    <li class="nav-item">
                        <router-link class="nav-link" active-class="active" to="/examiner/dashboard">Home</router-link>
                    </li>
                    <li class="nav-item">
                        <router-link class="nav-link" active-class="active" to="/examiner/exams">Exams</router-link>
                    </li>
                    <li class="nav-item">
                        <router-link class="nav-link" active-class="active" to="/examiner/slots">Slots</router-link>
                    </li>
                </ul>

                <!-- Navigation links for Student -->
                <ul class="navbar-nav me-auto mb-2 mb-lg-0" v-else-if="isLoggedIn && role === 'student'">
                    <li class="nav-item">
                        <router-link class="nav-link" active-class="active" to="/student/dashboard">Home</router-link>
                    </li>
                    <li class="nav-item">
                        <router-link class="nav-link" active-class="active" to="/student/exams">Exams</router-link>
                    </li>
                    <li class="nav-item">
                        <router-link class="nav-link" active-class="active" to="/student/history">History</router-link>
                    </li>
                    <li class="nav-item">
                        <router-link class="nav-link" active-class="active" to="/student/profile">Profile</router-link>
                    </li>
                </ul>

                <!-- Right-aligned items -->
                <div class="d-flex align-items-center ms-auto">
                    <!-- Contextual search bar -->
                    <div class="me-3" v-if="showSearch">
                        <input
                            type="search"
                            class="form-control form-control-sm"
                            placeholder="Search..."
                            v-model="query"
                        />
                    </div>

                    <!-- User status and Logout button -->
                    <div v-if="isLoggedIn" class="d-flex align-items-center">
                        <span class="navbar-text text-white me-3 d-none d-md-inline">
                            <strong>{{ user.name }}</strong> 
                            <span class="badge bg-light text-dark ms-1">{{ role }}</span>
                        </span>
                        <button class="btn btn-outline-light btn-sm" @click="handleLogout">
                            Logout
                        </button>
                    </div>

                    <!-- Guest login/register links -->
                    <div v-else class="navbar-nav">
                        <router-link class="nav-link" to="/login">Login</router-link>
                        <router-link class="nav-link" to="/register">Student Register</router-link>
                    </div>
                </div>
            </div>
        </div>
    </nav>
    `
};

window.Navbar = Navbar;
