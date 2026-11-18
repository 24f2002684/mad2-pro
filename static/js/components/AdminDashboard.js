// static/js/components/AdminDashboard.js
// Admin dashboard overview component.

const AdminDashboard = {
    props: ["searchQuery"],
    data() {
        return {
            user: window.API.getUser(),
            stats: {
                courses: 0,
                exams: 0,
                examiners: 0,
                students: 0,
                slots: 0,
                bookings: 0
            },
            loading: false
        };
    },
    mounted() {
        this.fetchDashboard();
    },
    methods: {
        async fetchDashboard() {
            this.loading = true;
            try {
                const data = await window.API.get("/api/admin/dashboard");
                this.stats = data;
            } catch (err) {
                // Endpoint will be fully wired in Milestone 3
            } finally {
                this.loading = false;
            }
        }
    },
    template: `
    <div>
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h2 class="fw-bold text-dark mb-0">Admin Dashboard</h2>
                <p class="text-muted">Welcome, {{ user.name }} ({{ user.email }})</p>
            </div>
            <span class="badge bg-primary fs-6">Administrator Portal</span>
        </div>

        <div class="row g-3 mb-4">
            <div class="col-md-4 col-sm-6">
                <div class="card border-0 bg-light p-3">
                    <div class="text-muted small">Total Courses</div>
                    <div class="fs-3 fw-bold text-primary">{{ stats.courses }}</div>
                </div>
            </div>
            <div class="col-md-4 col-sm-6">
                <div class="card border-0 bg-light p-3">
                    <div class="text-muted small">Total Examinations</div>
                    <div class="fs-3 fw-bold text-success">{{ stats.exams }}</div>
                </div>
            </div>
            <div class="col-md-4 col-sm-6">
                <div class="card border-0 bg-light p-3">
                    <div class="text-muted small">Approved Examiners</div>
                    <div class="fs-3 fw-bold text-info">{{ stats.examiners }}</div>
                </div>
            </div>
            <div class="col-md-4 col-sm-6">
                <div class="card border-0 bg-light p-3">
                    <div class="text-muted small">Registered Students</div>
                    <div class="fs-3 fw-bold text-warning">{{ stats.students }}</div>
                </div>
            </div>
            <div class="col-md-4 col-sm-6">
                <div class="card border-0 bg-light p-3">
                    <div class="text-muted small">Created Slots</div>
                    <div class="fs-3 fw-bold text-secondary">{{ stats.slots }}</div>
                </div>
            </div>
            <div class="col-md-4 col-sm-6">
                <div class="card border-0 bg-light p-3">
                    <div class="text-muted small">Total Bookings</div>
                    <div class="fs-3 fw-bold text-danger">{{ stats.bookings }}</div>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-body">
                <h5 class="card-title fw-bold">Quick Navigation</h5>
                <div class="d-flex flex-wrap gap-2 mt-3">
                    <router-link to="/admin/courses" class="btn btn-outline-primary">Manage Courses</router-link>
                    <router-link to="/admin/exams" class="btn btn-outline-success">Manage Exams</router-link>
                    <router-link to="/admin/examiners" class="btn btn-outline-info">Manage Examiners</router-link>
                    <router-link to="/admin/students" class="btn btn-outline-warning">Manage Students</router-link>
                    <router-link to="/admin/bookings" class="btn btn-outline-danger">View Bookings</router-link>
                </div>
            </div>
        </div>
    </div>
    `
};

window.AdminDashboard = AdminDashboard;
