// static/js/components/StudentHistory.js
// Student examination history, cancellation, and published scores review component.

const StudentHistory = {
    data() {
        return {
            bookings: [],
            loading: false,
            errorMessage: "",
            successMessage: ""
        };
    },
    mounted() {
        this.fetchHistory();
    },
    methods: {
        async fetchHistory() {
            this.loading = true;
            try {
                this.bookings = await window.API.get("/api/student/history");
            } catch (err) {
                this.errorMessage = err.message || "Failed to load booking history";
            } finally {
                this.loading = false;
            }
        },
        async cancelBooking(booking) {
            if (!confirm(`Are you sure you want to cancel your booking for ${booking.exam_name}?`)) return;
            this.errorMessage = "";
            this.successMessage = "";
            try {
                const res = await window.API.put(`/api/student/bookings/${booking.id}/cancel`);
                this.successMessage = res.message || "Booking cancelled successfully";
                this.fetchHistory();
            } catch (err) {
                this.errorMessage = err.message || "Failed to cancel booking";
            }
        }
    },
    template: `
    <div>
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h3 class="fw-bold text-dark mb-0">Examination History & Results</h3>
                <p class="text-muted small">Track your booked slots, cancellation status, and published evaluation marks</p>
            </div>
            <router-link to="/student/exams" class="btn btn-primary btn-sm">+ Book New Slot</router-link>
        </div>

        <div v-if="errorMessage" class="alert alert-danger py-2 small">{{ errorMessage }}</div>
        <div v-if="successMessage" class="alert alert-success py-2 small">{{ successMessage }}</div>

        <div class="card">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead>
                        <tr>
                            <th>Examination</th>
                            <th>Slot Date & Time</th>
                            <th>Examiner</th>
                            <th>Status</th>
                            <th>Evaluation / Score</th>
                            <th class="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading"><td colspan="6" class="text-center py-4 text-muted">Loading your history...</td></tr>
                        <tr v-else-if="bookings.length === 0"><td colspan="6" class="text-center py-4 text-muted">No examination bookings recorded yet</td></tr>
                        <tr v-for="b in bookings" :key="b.id">
                            <td>
                                <div class="fw-bold">{{ b.exam_name }}</div>
                                <div class="small text-muted">Booked: {{ b.booked_at ? b.booked_at.split('T')[0] : '-' }}</div>
                            </td>
                            <td>
                                <div>{{ b.slot_date }}</div>
                                <div class="small text-muted">{{ b.slot_start }} - {{ b.slot_end }}</div>
                            </td>
                            <td>{{ b.examiner_name }}</td>
                            <td>
                                <span class="badge" :class="{
                                    'bg-primary': b.status === 'Booked',
                                    'bg-secondary': b.status === 'Cancelled',
                                    'bg-success': b.status === 'Completed'
                                }">{{ b.status }}</span>
                            </td>
                            <td>
                                <div v-if="b.evaluation">
                                    <span class="badge bg-success fs-6">{{ b.evaluation.total_marks }} Marks</span>
                                    <div class="small text-muted mt-1" v-if="b.evaluation.remarks">"{{ b.evaluation.remarks }}"</div>
                                </div>
                                <div v-else-if="b.status === 'Cancelled'">
                                    <span class="text-muted small">Cancelled</span>
                                </div>
                                <div v-else-if="!b.results_published">
                                    <span class="badge bg-light text-dark border">Results Awaited</span>
                                </div>
                                <div v-else>
                                    <span class="badge bg-warning text-dark">Pending Evaluation</span>
                                </div>
                            </td>
                            <td class="text-end">
                                <button 
                                    class="btn btn-sm btn-outline-danger" 
                                    v-if="b.status === 'Booked'" 
                                    @click="cancelBooking(b)"
                                >
                                    Cancel Booking
                                </button>
                                <span v-else class="text-muted small">-</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `
};

window.StudentHistory = StudentHistory;
