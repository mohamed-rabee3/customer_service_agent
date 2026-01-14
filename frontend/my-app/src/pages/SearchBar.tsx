import "../styles/index.css";
function SearchBar() {
  return (
    <div className="search-bar mt-16 ">
      <div className="search-field ">
        <input
          className="search-input"
          placeholder="ابحث عن ID أو رقم تليفون"
        />
        <i className="fas fa-search search-icon"></i>
      </div>

      <input className="search-control" placeholder="dd/mm/yyyy" />

      <select className="search-control">
        <option>كل الوكلاء</option>
        <option>Agent 1</option>
      </select>

      <button className="filter-btn">
        <i className="fas fa-filter"></i>
        فلتر
      </button>
    </div>
  );
}
export default SearchBar;
