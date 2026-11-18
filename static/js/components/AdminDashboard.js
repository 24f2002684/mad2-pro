// static/js/components/AdminDashboard.js
// Admin dashboard overview component with Chart.js analytics & quick actions.

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
            analytics: {
                participation: { labels: [], data: [] },
                pass_fail: { labels: [], data: [] },
                monthly_trends: { labels: [], data: [] },
                totals: {}
            },
            loading: false,
            jobLoading: false,
            jobMessage: "",
            jobMessageType: "info",
            chartInstances: []
        };
    },
    mounted() {
        this.fetchDashboard();
        this.fetchAnalytics();
    },
    beforeUnmount() {
        this.destroyCharts();
    },
    methods: {
        async fetchDashboard() {
            try {
                const data = await window.API.get("/api/admin/dashboard");
                this.stats = data;
            } catch (err) {
                console.error("Dashboard count error:", err);
            }
        },
        async fetchAnalytics() {
            this.loading = true;
            try {
                const data = await window.API.get("/api/admin/analytics");
                this.analytics = data;
                this.$nextTick(() => {
                    this.renderCharts();
                });
            } catch (err) {
                console.error("Analytics fetch error:", err);
            } finally {
                this.loading = false;
            }
        },
        destroyCharts() {
            if (this.chartInstances && this.chartInstances.length) {
                this.chartInstances.forEach(chart => {
                    try {
                        if (chart && typeof chart.destroy === "function") {
                            chart.destroy();
                        }
                    } catch (e) {
                        console.warn("Chart destroy error:", e);
                    }
                });
                this.chartInstances = [];
            }
        },
        renderCharts() {
            if (!window.Chart) {
                console.warn("Chart.js not loaded");
                return;
            }
            this.destroyCharts();

            // 1. Participation Bar Chart
            const ctx1 = document.getElementById("participationChart");
            if (ctx1 && this.analytics.participation) {
                const c1 = new window.Chart(ctx1, {
                    type: "bar",
                    data: {
                        labels: this.analytics.participation.labels,
                        datasets: [{
                            label: "Candidate Bookings",
                            data: this.analytics.participation.data,
                            backgroundColor: "rgba(13, 110, 253, 0.75)",
                            borderColor: "#0d6efd",
                            borderWidth: 1,
                            borderRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            title: { display: true, text: "Candidate Bookings per Examination", font: { size: 14 } }
                        },
                        scales: {
                            y: { beginAtZero: true, ticks: { precision: 0 } },
                            x: {
                                ticks: {
                                    maxRotation: 45,
                                    minRotation: 0,
                                    callback: function(val, index) {
                                        const label = this.getLabelForValue(val);
                                        return label.length > 18 ? label.substring(0, 18) + "..." : label;
                                    }
                                }
                            }
                        }
                    }
                });
                this.chartInstances.push(c1);
            }

            // 2. Pass vs Fail Doughnut Chart
            const ctx2 = document.getElementById("passFailChart");
            if (ctx2 && this.analytics.pass_fail) {
                const c2 = new window.Chart(ctx2, {
                    type: "doughnut",
                    data: {
                        labels: this.analytics.pass_fail.labels,
                        datasets: [{
                            data: this.analytics.pass_fail.data,
                            backgroundColor: [
                                "rgba(25, 135, 84, 0.85)",
                                "rgba(220, 53, 69, 0.85)"
                            ],
                            borderColor: ["#198754", "#dc3545"],
                            borderWidth: 1.5
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: "bottom" },
                            title: { display: true, text: "Evaluation Outcomes (Pass ≥ 40%)", font: { size: 14 } }
                        }
                    }
                });
                this.chartInstances.push(c2);
            }

            // 3. Monthly Booking Trends Line Chart
            const ctx3 = document.getElementById("monthlyTrendsChart");
            if (ctx3 && this.analytics.monthly_trends) {
                const c3 = new window.Chart(ctx3, {
                    type: "line",
                    data: {
                        labels: this.analytics.monthly_trends.labels,
                        datasets: [{
                            label: "Total Bookings",
                            data: this.analytics.monthly_trends.data,
                            borderColor: "#0dcaf0",
                            backgroundColor: "rgba(13, 202, 240, 0.15)",
                            fill: true,
                            tension: 0.35,
                            pointRadius: 5,
                            pointHoverRadius: 7,
                            pointBackgroundColor: "#0dcaf0"
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            title: { display: true, text: "Monthly Booking Volume Trend", font: { size: 14 } }
                        },
                        scales: {
                            y: { beginAtZero: true, ticks: { precision: 0 } }
                        }
                    }
                });
                this.chartInstances.push(c3);
            }
        },
        async triggerJob(jobType) {
            this.jobLoading = true;
            this.jobMessage = "";
            try {
                const endpoint = jobType === "reminder"
                    ? "/api/admin/trigger-job/daily-reminder"
                    : "/api/admin/trigger-job/monthly-report";
                const res = await window.API.post(endpoint, {});
                this.jobMessageType = "success";
                this.jobMessage = res.message || "Job executed successfully";
            } catch (err) {
                this.jobMessageType = "danger";
                this.jobMessage = err.message || "Failed to trigger job";
            } finally {
                this.jobLoading = false;
            }
        }
    },
    template: `
    <div>
        <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <div>
                <h2 class="fw-bold text-dark mb-0">Admin Dashboard</h2>
                <p class="text-muted mb-0">Welcome, {{ user.name }} ({{ user.email }})</p>
            </div>
            <div class="d-flex align-items-center gap-2">
                <button class="btn btn-sm btn-outline-secondary" @click="fetchAnalytics" :disabled="loading">
                    <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
                    Refresh Analytics
                </button>
                <span class="badge bg-primary fs-6">Administrator Portal</span>
            </div>
        </div>

        <!-- Metric Summary Cards -->
        <div class="row g-3 mb-4">
            <div class="col-lg-2 col-md-4 col-sm-6">
                <div class="card border-0 shadow-sm p-3 bg-white h-100">
                    <div class="text-muted small">Total Courses</div>
                    <div class="fs-3 fw-bold text-primary">{{ stats.courses }}</div>
                </div>
            </div>
            <div class="col-lg-2 col-md-4 col-sm-6">
                <div class="card border-0 shadow-sm p-3 bg-white h-100">
                    <div class="text-muted small">Examinations</div>
                    <div class="fs-3 fw-bold text-success">{{ stats.exams }}</div>
                </div>
            </div>
            <div class="col-lg-2 col-md-4 col-sm-6">
                <div class="card border-0 shadow-sm p-3 bg-white h-100">
                    <div class="text-muted small">Approved Examiners</div>
                    <div class="fs-3 fw-bold text-info">{{ stats.examiners }}</div>
                </div>
            </div>
            <div class="col-lg-2 col-md-4 col-sm-6">
                <div class="card border-0 shadow-sm p-3 bg-white h-100">
                    <div class="text-muted small">Students</div>
                    <div class="fs-3 fw-bold text-warning">{{ stats.students }}</div>
                </div>
            </div>
            <div class="col-lg-2 col-md-4 col-sm-6">
                <div class="card border-0 shadow-sm p-3 bg-white h-100">
                    <div class="text-muted small">Available Slots</div>
                    <div class="fs-3 fw-bold text-secondary">{{ stats.slots }}</div>
                </div>
            </div>
            <div class="col-lg-2 col-md-4 col-sm-6">
                <div class="card border-0 shadow-sm p-3 bg-white h-100">
                    <div class="text-muted small">Total Bookings</div>
                    <div class="fs-3 fw-bold text-danger">{{ stats.bookings }}</div>
                </div>
            </div>
        </div>

        <!-- Quick Navigation -->
        <div class="card border-0 shadow-sm mb-4">
            <div class="card-body py-3">
                <div class="d-flex flex-wrap gap-2 align-items-center">
                    <span class="fw-semibold text-secondary me-2">Quick Navigation:</span>
                    <router-link to="/admin/courses" class="btn btn-sm btn-outline-primary">Courses</router-link>
                    <router-link to="/admin/exams" class="btn btn-sm btn-outline-success">Exams & Rubrics</router-link>
                    <router-link to="/admin/examiners" class="btn btn-sm btn-outline-info">Examiners</router-link>
                    <router-link to="/admin/students" class="btn btn-sm btn-outline-warning">Students</router-link>
                    <router-link to="/admin/slots" class="btn btn-sm btn-outline-secondary">Slots Oversight</router-link>
                    <router-link to="/admin/bookings" class="btn btn-sm btn-outline-danger">Bookings & Reschedule</router-link>
                </div>
            </div>
        </div>

        <!-- Charts & Analytics Section -->
        <div class="row g-4 mb-4">
            <div class="col-lg-8">
                <!-- Bar Chart: Participation -->
                <div class="card border-0 shadow-sm mb-4">
                    <div class="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                        <h5 class="fw-bold mb-0">Examination Participation</h5>
                        <span class="badge bg-light text-dark">Bar Chart</span>
                    </div>
                    <div class="card-body">
                        <div style="height: 280px; position: relative;">
                            <canvas id="participationChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Line Chart: Monthly Trends -->
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                        <h5 class="fw-bold mb-0">Booking Volume Trends</h5>
                        <span class="badge bg-light text-dark">Line Chart</span>
                    </div>
                    <div class="card-body">
                        <div style="height: 240px; position: relative;">
                            <canvas id="monthlyTrendsChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-4">
                <!-- Doughnut Chart: Pass / Fail -->
                <div class="card border-0 shadow-sm mb-4">
                    <div class="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                        <h5 class="fw-bold mb-0">Performance Overview</h5>
                        <span class="badge bg-light text-dark">Pass / Fail</span>
                    </div>
                    <div class="card-body">
                        <div style="height: 280px; position: relative;">
                            <canvas id="passFailChart"></canvas>
                        </div>
                        <div class="text-center text-muted small mt-2">
                            Pass standard: ≥ 40% aggregate rubric score
                        </div>
                    </div>
                </div>

                <!-- Celery Viva Demonstration Triggers -->
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-white border-0 py-3">
                        <h5 class="fw-bold mb-0">Celery Batch Jobs (Viva Demo)</h5>
                    </div>
                    <div class="card-body">
                        <p class="text-muted small mb-3">
                            Manually dispatch background batch tasks to demonstrate Celery worker & beat operations:
                        </p>
                        <div class="d-grid gap-2 mb-3">
                            <button class="btn btn-outline-primary btn-sm" @click="triggerJob('reminder')" :disabled="jobLoading">
                                <span v-if="jobLoading" class="spinner-border spinner-border-sm me-1"></span>
                                Trigger Daily Slot Reminders
                            </button>
                            <button class="btn btn-outline-success btn-sm" @click="triggerJob('report')" :disabled="jobLoading">
                                <span v-if="jobLoading" class="spinner-border spinner-border-sm me-1"></span>
                                Trigger Monthly Activity Report
                            </button>
                        </div>
                        <div v-if="jobMessage" :class="'alert alert-' + jobMessageType + ' py-2 small mb-0'">
                            {{ jobMessage }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `
};

window.AdminDashboard = AdminDashboard;
