
import "../styles/index.css"
function DashboardTable() {
  return (
    <div className="table-card">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>اسم الوكيل</th>
            <th>النوع</th>
            <th>التدخلات</th>
            <th>الأداء</th>
            <th>الوقت</th>
            <th>الفشل</th>
            <th>الخيارات</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>أحمد محمد</td>
            <td>صوتي</td>
            <td>45</td>
            <td>92%</td>
            <td>4:32</td>
            <td>2</td>
            <td className="table-actions">
              <button className="btn-sm btn-danger">حذف</button>
              <button className="btn-sm btn-success">تعديل</button>
              <button className="btn-sm btn-info">معلومات</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
export default DashboardTable;