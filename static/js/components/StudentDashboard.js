// static/js/components/StudentDashboard.js
// Student dashboard overview and recent activities component.

const StudentDashboard = {
    props: ["searchQuery"],
    data() {
        return {
            user: window.API.getUser(),
            stats: {
                available_exams: 0,
                upcoming_exams: 0,
                booked_slots: 0,
                published_results: 0,
                recent_bookings: []
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
                this.stats = await window.API.get("/api/student/dashboard");
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            } finally {
                this.loading = false;
            }
        }
    },
    template: `
    <div>
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h2 class="fw-bold text-dark mb-0">Student Dashboard</h2>
                <p class="text-muted">Welcome, {{ user.name }} ({{ user.email }})</p>
            </div>
            <span class="badge bg-info text-dark fs-6">Candidate Portal</span>
        </div>

        <div class="row g-3 mb-4">
            <div class="col-md-3 col-sm-6">
                <div class="card border-0 bg-light p-3">
                    <div class="text-muted small">Available Exams</div>
                    <div class="fs-3 fw-bold text-primary">{{ stats.available_exams }}</div>
                </div>
            </div>
            <div class="col-md-3 col-sm-6">
                <div class="card border-0 bg-light p-3">
                    <div class="text-muted small">Upcoming Bookings</div>
                    <div class="fs-3 fw-bold text-success">{{ stats.upcoming_exams }}</div>
                </div>
            </div>
            <div class="col-md-3 col-sm-6">
                <div class="card border-0 bg-light p-3">
                    <div class="text-muted small">Total Bookings</div>
                    <div class="fs-3 fw-bold text-info">{{ stats.booked_slots }}</div>
                </div>
            </div>
            <div class="col-md-3 col-sm-6">
                <div class="card border-0 bg-light p-3">
                    <div class="text-muted small">Published Results</div>
                    <div class="fs-3 fw-bold text-warning">{{ stats.published_results }}</div>
                </div>
            </div>
        </div>

        <div class="card mb-4" v-if="stats.recent_bookings && stats.recent_bookings.length > 0">
            <div class="card-header bg-white fw-bold d-flex justify-content-between align-items-center">
                <span>Recent Bookings</span>
                <router-link to="/student/history" class="small text-decoration-none">View All &rarr;</router-link>
            </div>
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead class="table-light">
                        <tr>
                            <th>Examination</th>
                            <th>Date & Time</th>
                            <th>Examiner</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="b in stats.recent_bookings" :key="b.id">
                            <td class="fw-bold">{{ b.exam_name }}</td>
                            <td>{{ b.slot_date }} ({{ b.slot_start }}-{{ b.slot_end }})</td>
                            <td>{{ b.examiner_name }}</td>
                            <td>
                                <span class="badge" :class="{
                                    'bg-primary': b.status === 'Booked',
                                    'bg-secondary': b.status === 'Cancelled',
                                    'bg-success': b.status === 'Completed'
                                }">{{ b.status }}</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="card">
            <div class="card-body">
                <h5 class="card-title fw-bold">Quick Actions</h5>
                <div class="d-flex flex-wrap gap-2 mt-3">
                    <router-link to="/student/exams" class="btn btn-outline-primary">Browse & Book Examinations</router-link>
                    <router-link to="/student/history" class="btn btn-outline-success">View Booking History & Results</router-link>
                    <router-link to="/student/profile" class="btn btn-outline-secondary">My Candidate Profile</router-link>
                </div>
            </div>
        </div>
    </div>
    `
};

window.StudentDashboard = StudentDashboard;
