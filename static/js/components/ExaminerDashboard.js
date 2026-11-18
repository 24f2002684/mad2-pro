// static/js/components/ExaminerDashboard.js
// Examiner dashboard overview component.

const ExaminerDashboard = {
    props: ["searchQuery"],
    data() {
        return {
            user: window.API.getUser(),
            stats: {
                assigned_exams: 0,
                created_slots: 0,
                booked_students: 0,
                pending_evaluations: 0
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
                const data = await window.API.get("/api/examiner/dashboard");
                this.stats = data;
            } catch (err) {
                // Endpoint wired in Milestone 4
            } finally {
                this.loading = false;
            }
        }
    },
    template: `
    <div>
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h2 class="fw-bold text-dark mb-0">Examiner Dashboard</h2>
                <p class="text-muted">Welcome, {{ user.name }} ({{ user.email }})</p>
            </div>
            <span class="badge bg-success fs-6">Examiner Portal</span>
        </div>

        <div class="row g-3 mb-4">
            <div class="col-md-3 col-sm-6">
                <div class="card border-0 bg-light p-3">
                    <div class="text-muted small">Assigned Examinations</div>
                    <div class="fs-3 fw-bold text-primary">{{ stats.assigned_exams }}</div>
                </div>
            </div>
            <div class="col-md-3 col-sm-6">
                <div class="card border-0 bg-light p-3">
                    <div class="text-muted small">Created Slots</div>
                    <div class="fs-3 fw-bold text-success">{{ stats.created_slots }}</div>
                </div>
            </div>
            <div class="col-md-3 col-sm-6">
                <div class="card border-0 bg-light p-3">
                    <div class="text-muted small">Booked Students</div>
                    <div class="fs-3 fw-bold text-info">{{ stats.booked_students }}</div>
                </div>
            </div>
            <div class="col-md-3 col-sm-6">
                <div class="card border-0 bg-light p-3">
                    <div class="text-muted small">Pending Evaluations</div>
                    <div class="fs-3 fw-bold text-warning">{{ stats.pending_evaluations }}</div>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-body">
                <h5 class="card-title fw-bold">Quick Actions</h5>
                <div class="d-flex flex-wrap gap-2 mt-3">
                    <router-link to="/examiner/exams" class="btn btn-outline-primary">View Assigned Exams</router-link>
                    <router-link to="/examiner/slots" class="btn btn-outline-success">Manage Examination Slots</router-link>
                </div>
            </div>
        </div>
    </div>
    `
};

window.ExaminerDashboard = ExaminerDashboard;
