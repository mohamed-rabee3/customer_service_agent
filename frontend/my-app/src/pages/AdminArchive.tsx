// // import React, { useState, useEffect } from "react";
// // import { Search, Calendar } from "lucide-react";
// // import "../styles/index.css";
// // // Random mock
// // const generateRandomSupervisors = (count = 10) => {
// //   const names = [
// //     "Alex",
// //     "Jordan",
// //     "Taylor",
// //     "Morgan",
// //     "Casey",
// //     "Riley",
// //     "Quinn",
// //     "Jamie",
// //     "Chris",
// //     "Sam",
// //   ];
// //   const types = ["Voice", "Chat"] as const;
// //   return Array.from({ length: count }, (_, i) => ({
// //     name: `${names[i % names.length]} ${i + 1}`,
// //     type: types[Math.floor(Math.random() * types.length)],
// //     totalInterventions: Math.floor(Math.random() * 100) + 20,
// //     performance: Math.floor(Math.random() * 70) + 30,
// //     avgHandleTime: `00:${String(Math.floor(Math.random() * 15) + 5).padStart(
// //       2,
// //       "0"
// //     )}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
// //     failed: Math.floor(Math.random() * 25),
// //   }));
// // };

// // const AdminArchive: React.FC = () => {
// //   const [searchTerm, setSearchTerm] = useState("");
// //   const [selectedDate, setSelectedDate] = useState<string>("");
// //   const [selectedType, setSelectedType] = useState<string>("all");
// //   type Supervisor = {
// //     name: string;
// //     type: "Voice" | "Chat";
// //     totalInterventions: number;
// //     performance: number;
// //     avgHandleTime: string;
// //     failed: number;
// //   };
// //   const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
// //   const [isLoading, setIsLoading] = useState<boolean>(true);
// // const [showAddModal, setShowAddModal] = useState(false);
// // const [showEditModal, setShowEditModal] = useState<number | null>(null);
// // const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
// // const [showInfoModal, setShowInfoModal] = useState<number | null>(null);
// //   useEffect(() => {
// //     const loadSupervisors = async () => {
// //       setIsLoading(true);

// //       try {
// //         const res = await fetch(
// //           `/api/admin/supervisors?type=${selectedType}&search=${searchTerm}&date=${selectedDate}`
// //         );
// //         if (res.ok) {
// //           const data = await res.json();
// //           if (Array.isArray(data)) setSupervisors(data);
// //           else throw new Error("Invalid data");
// //         } else throw new Error("API failed");
// //       } catch  {
// //         console.warn("Admin API failed → using random supervisors");
// //         setSupervisors(generateRandomSupervisors());
// //       }

// //       setIsLoading(false);
// //     };

// //     loadSupervisors();
// //   }, [selectedType, searchTerm, selectedDate]);

// //   const getColor = (value: number) => {
// //     if (value < 40) return "text-red-600";
// //     if (value < 70) return "text-amber-500";
// //     return "text-teal-600";
// //   };

// //   if (isLoading) {
// //     return (
// //       <div className="flex items-center justify-center min-h-screen bg-teal-50 ">
// //         <div className="loader"></div>
// //       </div>
// //     );
// //   }
// // if (isLoading) {
// //   return (
// //     <div className="min-h-screen flex items-center justify-center loader"></div>
// //   );
// // }
// //   return (
// //     <div
// //       className="bg-linear-to-br from-teal-50 to-cyan-50 min-h-screen p-4 sm:p-6 md:p-8 lg:p-12"
// //       dir="ltr"
// //     >
// //       <div className="max-w-7xl mx-auto">
// //         {/* Header */}
// //         <header className="text-center mb-16">
// //           <h1 className="text-5xl md:text-6xl font-extralight text-transparent bg-clip-text bg-linear-to-r from-teal-700 to-teal-500 mb-4">
// //             Admin Dashboard
// //           </h1>
// //           <p className="text-xl text-teal-700 font-medium">
// //             Supervisors Management & Performance
// //           </p>
// //         </header>

// //         {/* Filters Bar - نفس اللي في Analytics بالضبط */}

// //         <div className="mb-12">
// //           <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 shadow-lg border border-teal-100">
// //             <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
// //               <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto items-center">
// //                 {/* Date */}
// //                 <div className="relative">
// //                   <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500 w-5 h-5 pointer-events-none" />
// //                   <input
// //                     type="date"
// //                     value={selectedDate}
// //                     onChange={(e) => setSelectedDate(e.target.value)}
// //                     className="pl-12 pr-6 py-4 rounded-2xl border border-teal-200 bg-white/90 focus:outline-none focus:ring-4 focus:ring-teal-300 transition-all hide-date-icon"
// //                   />
// //                 </div>

// //                 {/* Type Filter تاني حاجة */}
// //                 <select
// //                   value={selectedType}
// //                   onChange={(e) => setSelectedType(e.target.value)}
// //                   className="px-6 py-4 rounded-2xl bg-white/90 border border-teal-200 shadow-sm text-teal-800 font-medium focus:outline-none focus:ring-4 focus:ring-teal-300 transition-all min-w-45"
// //                 >
// //                   <option value="all">All Types</option>
// //                   <option value="voice">🎧 Voice</option>
// //                   <option value="chat">💬 Chat</option>
// //                 </select>

// //                 {/* Search Bar */}
// //                 <div className="relative flex-1 min-w-62.5 max-w-lg">
// //                   <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-teal-500 w-5 h-5" />
// //                   <input
// //                     type="text"
// //                     placeholder="Search supervisors..."
// //                     value={searchTerm}
// //                     onChange={(e) => setSearchTerm(e.target.value)}
// //                     className="w-full pl-12 pr-6 py-4 rounded-2xl border border-teal-200 bg-white/90 focus:outline-none focus:ring-4 focus:ring-teal-300 transition-all text-lg"
// //                   />
// //                 </div>
// //               </div>

// //               {/* Right: Add Supervisor Button */}
// //               <button className="px-8 py-4 bg-teal-600 text-white rounded-2xl font-medium hover:bg-teal-700 transition-all shadow-md whitespace-nowrap">
// //                 + Add Supervisor
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //         {/* Supervisors Table */}
// //         <div className="backdrop-blur-md bg-white/80 rounded-3xl p-6 md:p-10 shadow-xl border border-teal-100">
// //           <h2 className="text-2xl font-semibold text-teal-800 mb-8 text-center">
// //             Active Supervisors
// //           </h2>
// //           <div className="overflow-x-auto">
// //             <table className="w-full text-left">
// //               <thead className="border-b-2 border-teal-200">
// //                 <tr>
// //                   <th className="py-4 px-6 font-semibold text-teal-800">
// //                     Supervisor Name
// //                   </th>
// //                   <th className="py-4 px-6 font-semibold text-teal-800">
// //                     Type
// //                   </th>
// //                   <th className="py-4 px-6 font-semibold text-teal-800">
// //                     Total Interventions
// //                   </th>
// //                   <th className="py-4 px-6 font-semibold text-teal-800">
// //                     Performance
// //                   </th>
// //                   <th className="py-4 px-6 font-semibold text-teal-800">
// //                     Avg. Handle Time
// //                   </th>
// //                   <th className="py-4 px-6 font-semibold text-teal-800">
// //                     Failed
// //                   </th>
// //                   <th className="py-4 px-6 font-semibold text-teal-800">
// //                     Options
// //                   </th>
// //                 </tr>
// //               </thead>
// //               <tbody>
// //                 {supervisors.map((sup) => (
// //                   <tr
// //                     key={sup.name}
// //                     className="border-b border-teal-100 hover:bg-teal-50/50 transition-colors"
// //                   >
// //                     <td className="py-4 px-6 font-medium">{sup.name}</td>
// //                     <td className="py-4 px-6">
// //                       {sup.type === "Voice" ? "🎧 Voice" : "💬 Chat"}
// //                     </td>
// //                     <td className="py-4 px-6">{sup.totalInterventions}</td>
// //                     <td
// //                       className={`py-4 px-6 font-bold ${getColor(
// //                         sup.performance
// //                       )}`}
// //                     >
// //                       {sup.performance}%
// //                     </td>
// //                     <td className="py-4 px-6">{sup.avgHandleTime}</td>
// //                     <td className="py-4 px-6 text-red-600">{sup.failed}</td>
// //                     <td className="py-4 px-6">
// //                       <button className="text-red-600 hover:underline mr-3">
// //                         Delete
// //                       </button>
// //                       <button className="text-teal-600 hover:underline mr-3">
// //                         Edit
// //                       </button>
// //                       <button className="text-gray-600 hover:underline">
// //                         Info
// //                       </button>
// //                     </td>
// //                   </tr>
// //                 ))}
// //               </tbody>
// //             </table>
// //           </div>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // };

// // export default AdminArchive;
// import React, { useState, useEffect } from "react";
// import { Search, Calendar, Eye, Pencil, Trash2, X } from "lucide-react";
// import "../styles/index.css";

// // ──────────────────────────────
// // Mock Data & Helpers
// // ──────────────────────────────
// const generateRandomSupervisors = (count = 10) => {
//   const names = [
//     "Alex",
//     "Jordan",
//     "Taylor",
//     "Morgan",
//     "Casey",
//     "Riley",
//     "Quinn",
//     "Jamie",
//     "Chris",
//     "Sam",
//   ];
//   const types = ["Voice", "Chat"] as const;
//   return Array.from({ length: count }, (_, i) => ({
//     id: i + 1,
//     name: `${names[i % names.length]} ${i + 1}`,
//     type: types[Math.floor(Math.random() * types.length)],
//     phone: `+20${Math.floor(1000000000 + Math.random() * 9000000000)}`,
//     email: `sup${i + 1}@example.com`,
//     totalInterventions: Math.floor(Math.random() * 100) + 20,
//     performance: Math.floor(Math.random() * 70) + 30,
//     avgHandleTime: `00:${String(Math.floor(Math.random() * 15) + 5).padStart(
//       2,
//       "0"
//     )}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
//     failed: Math.floor(Math.random() * 25),
//   }));
// };

// const getColor = (value: number) => {
//   if (value < 40) return "text-red-600";
//   if (value < 70) return "text-amber-500";
//   return "text-teal-600";
// };

// const AdminArchive: React.FC = () => {
//   const [searchTerm, setSearchTerm] = useState("");
//   const [selectedDate, setSelectedDate] = useState("");
//   const [selectedType, setSelectedType] = useState("all");
//   const [supervisors, setSupervisors] = useState<any[]>([]);
//   const [isLoading, setIsLoading] = useState(true);

//   // States for Modals
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [showEditModal, setShowEditModal] = useState<number | null>(null);
//   const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(
//     null
//   );
//   const [showInfoModal, setShowInfoModal] = useState<number | null>(null);

//   useEffect(() => {
//     const loadSupervisors = async () => {
//       setIsLoading(true);
//       try {
//         // const res = await fetch(`/api/admin/supervisors?...`);
//         // if (res.ok) setSupervisors(await res.json());
//         // else throw new Error();
//       } catch {
//         setSupervisors(generateRandomSupervisors(12));
//       }
//       setIsLoading(false);
//     };
//     loadSupervisors();
//   }, [selectedType, searchTerm, selectedDate]);

//   // ──────────────────────────────
//   // Handlers
//   // ──────────────────────────────
//   const handleAddSupervisor = (e: React.FormEvent) => {
//     e.preventDefault();
//     // هنا هتستدعي الـ API للإضافة
//     // مثال بسيط للـ mock:
//     const form = e.target as HTMLFormElement;
//     const newSup = {
//       id: supervisors.length + 1,
//       name: form.supName.value,
//       type: form.supType.value,
//       phone: form.supPhone.value,
//       email: form.supEmail.value,
//       totalInterventions: 0,
//       performance: 0,
//       avgHandleTime: "00:00:00",
//       failed: 0,
//     };
//     setSupervisors([...supervisors, newSup]);
//     setShowAddModal(false);
//   };

//   const handleDelete = (id: number) => {
//     setSupervisors(supervisors.filter((s) => s.id !== id));
//     setShowDeleteConfirm(null);
//   };

//   // ──────────────────────────────
//   // Modals Components
//   // ──────────────────────────────
//   const AddModal = () => (
//     <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative">
//         <button
//           onClick={() => setShowAddModal(false)}
//           className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
//         >
//           <X size={24} />
//         </button>
//         <h2 className="text-2xl font-bold text-teal-800 mb-6">
//           Add New Supervisor
//         </h2>
//         <form onSubmit={handleAddSupervisor} className="space-y-5">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Full Name
//             </label>
//             <input
//               name="supName"
//               required
//               className="w-full px-4 py-3 rounded-xl border border-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Phone Number
//             </label>
//             <input
//               name="supPhone"
//               required
//               type="tel"
//               className="w-full px-4 py-3 rounded-xl border border-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Email
//             </label>
//             <input
//               name="supEmail"
//               required
//               type="email"
//               className="w-full px-4 py-3 rounded-xl border border-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Type
//             </label>
//             <select
//               name="supType"
//               className="w-full px-4 py-3 rounded-xl border border-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
//             >
//               <option value="Voice">Voice</option>
//               <option value="Chat">Chat</option>
//             </select>
//           </div>
//           <button
//             type="submit"
//             className="w-full py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition"
//           >
//             Add Supervisor
//           </button>
//         </form>
//       </div>
//     </div>
//   );

//   const DeleteConfirmModal = () => {
//     const sup = supervisors.find((s) => s.id === showDeleteConfirm);
//     if (!sup) return null;
//     return (
//       <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
//         <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
//           <h3 className="text-xl font-bold text-gray-900 mb-4">
//             Confirm Delete
//           </h3>
//           <p className="text-gray-600 mb-8">
//             Are you sure you want to delete <strong>{sup.name}</strong>?<br />
//             This action cannot be undone.
//           </p>
//           <div className="flex gap-4 justify-end">
//             <button
//               onClick={() => setShowDeleteConfirm(null)}
//               className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg"
//             >
//               Cancel
//             </button>
//             <button
//               onClick={() => handleDelete(sup.id)}
//               className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
//             >
//               Yes, Delete
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   if (isLoading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="loader"></div>
//       </div>
//     );
//   }

//   return (
//     <div
//       className="bg-gradient-to-br from-teal-50 to-cyan-50 min-h-screen p-4 sm:p-6 md:p-8 lg:p-12"
//       dir="ltr"
//     >
//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <header className="text-center mb-12 md:mb-16">
//           <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-transparent bg-clip-text bg-gradient-to-r from-teal-700 to-teal-500">
//             Admin Dashboard
//           </h1>
//           <p className="text-lg md:text-xl text-teal-700 mt-3">
//             Supervisors Management
//           </p>
//         </header>

//         {/* Filters + Add Button */}
//         <div className="mb-10 md:mb-12 bg-white/70 backdrop-blur-md rounded-3xl p-5 md:p-6 shadow-lg border border-teal-100">
//           <div className="flex flex-col lg:flex-row gap-5 md:gap-6 items-center justify-between">
//             <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
//               {/* Date */}
//               <div className="relative w-full sm:w-64">
//                 <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500 w-5 h-5 pointer-events-none" />
//                 <input
//                   type="date"
//                   value={selectedDate}
//                   onChange={(e) => setSelectedDate(e.target.value)}
//                   className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-teal-200 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-300"
//                 />
//               </div>

//               {/* Type */}
//               <select
//                 value={selectedType}
//                 onChange={(e) => setSelectedType(e.target.value)}
//                 className="w-full sm:w-48 px-5 py-3.5 rounded-xl border border-teal-200 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-300"
//               >
//                 <option value="all">All Types</option>
//                 <option value="voice">Voice</option>
//                 <option value="chat">Chat</option>
//               </select>

//               {/* Search */}
//               <div className="relative flex-1 min-w-64">
//                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500 w-5 h-5" />
//                 <input
//                   type="text"
//                   placeholder="Search supervisors..."
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                   className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-teal-200 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-300"
//                 />
//               </div>
//             </div>

//             {/* Add Button */}
//             <button
//               onClick={() => setShowAddModal(true)}
//               className="w-full sm:w-auto px-8 py-3.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition shadow-md"
//             >
//               + Add Supervisor
//             </button>
//           </div>
//         </div>

//         {/* Table */}
//         <div className="backdrop-blur-md bg-white/80 rounded-3xl p-6 md:p-8 lg:p-10 shadow-xl border border-teal-100">
//           <h2 className="text-2xl font-semibold text-teal-800 mb-6 text-center">
//             Active Supervisors
//           </h2>
//           <div className="overflow-x-auto">
//             <table className="w-full text-left min-w-[900px]">
//               <thead className="border-b-2 border-teal-200">
//                 <tr>
//                   <th className="py-4 px-6 font-semibold text-teal-800">
//                     Name
//                   </th>
//                   <th className="py-4 px-6 font-semibold text-teal-800">
//                     Type
//                   </th>
//                   <th className="py-4 px-6 font-semibold text-teal-800">
//                     Total Interventions
//                   </th>
//                   <th className="py-4 px-6 font-semibold text-teal-800">
//                     Performance
//                   </th>
//                   <th className="py-4 px-6 font-semibold text-teal-800">
//                     Avg. Handle Time
//                   </th>
//                   <th className="py-4 px-6 font-semibold text-teal-800">
//                     Failed
//                   </th>
//                   <th className="py-4 px-6 font-semibold text-teal-800 text-right">
//                     Actions
//                   </th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {supervisors.map((sup) => (
//                   <tr
//                     key={sup.id}
//                     className="border-b border-teal-100 hover:bg-teal-50/50 transition-colors"
//                   >
//                     <td className="py-4 px-6 font-medium">{sup.name}</td>
//                     <td className="py-4 px-6">
//                       {sup.type === "Voice" ? "🎧 Voice" : "💬 Chat"}
//                     </td>
//                     <td className="py-4 px-6">{sup.totalInterventions}</td>
//                     <td
//                       className={`py-4 px-6 font-bold ${getColor(
//                         sup.performance
//                       )}`}
//                     >
//                       {sup.performance}%
//                     </td>
//                     <td className="py-4 px-6">{sup.avgHandleTime}</td>
//                     <td className="py-4 px-6 text-red-600">{sup.failed}</td>
//                     <td className="py-4 px-6 text-right">
//                       <div className="flex items-center justify-end gap-5">
//                         <button
//                           title="View Info"
//                           onClick={() => setShowInfoModal(sup.id)}
//                           className="text-gray-600 hover:text-gray-900 transition"
//                         >
//                           <Eye size={20} />
//                         </button>
//                         <button
//                           title="Edit"
//                           onClick={() => setShowEditModal(sup.id)}
//                           className="text-teal-600 hover:text-teal-800 transition"
//                         >
//                           <Pencil size={20} />
//                         </button>
//                         <button
//                           title="Delete"
//                           onClick={() => setShowDeleteConfirm(sup.id)}
//                           className="text-red-600 hover:text-red-800 transition"
//                         >
//                           <Trash2 size={20} />
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>

//       {/* Modals */}
//       {showAddModal && <AddModal />}
//       {showDeleteConfirm && <DeleteConfirmModal />}

//       {/* Info Modal (بسيط كمثال) */}
//       {showInfoModal && (
//         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative">
//             <button
//               onClick={() => setShowInfoModal(null)}
//               className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
//             >
//               <X size={24} />
//             </button>
//             <h2 className="text-2xl font-bold text-teal-800 mb-6">
//               Supervisor Info
//             </h2>
//             {supervisors.find((s) => s.id === showInfoModal) && (
//               <div className="space-y-4">
//                 <p>
//                   <strong>Name:</strong>{" "}
//                   {supervisors.find((s) => s.id === showInfoModal).name}
//                 </p>
//                 <p>
//                   <strong>Type:</strong>{" "}
//                   {supervisors.find((s) => s.id === showInfoModal).type}
//                 </p>
//                 <p>
//                   <strong>Phone:</strong>{" "}
//                   {supervisors.find((s) => s.id === showInfoModal).phone}
//                 </p>
//                 <p>
//                   <strong>Email:</strong>{" "}
//                   {supervisors.find((s) => s.id === showInfoModal).email}
//                 </p>
//                 <p>
//                   <strong>Total Interventions:</strong>{" "}
//                   {
//                     supervisors.find((s) => s.id === showInfoModal)
//                       .totalInterventions
//                   }
//                 </p>
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default AdminArchive;
import React, { useState, useEffect } from "react";
import { Search, Calendar } from "lucide-react";
import "../styles/index.css";

// Type definition
interface Supervisor {
  name: string;
  type: "Voice" | "Chat";
  totalInterventions: number;
  performance: number;
  avgHandleTime: string;
  failed: number;
}

// Mock data generator
const generateRandomSupervisors = (count = 10): Supervisor[] => {
  const names = [
    "Alex",
    "Jordan",
    "Taylor",
    "Morgan",
    "Casey",
    "Riley",
    "Quinn",
    "Jamie",
    "Chris",
    "Sam",
  ];
  const types = ["Voice", "Chat"] as const;
  return Array.from({ length: count }, (_, i) => ({
    name: `${names[i % names.length]} ${i + 1}`,
    type: types[Math.floor(Math.random() * types.length)],
    totalInterventions: Math.floor(Math.random() * 100) + 20,
    performance: Math.floor(Math.random() * 70) + 30,
    avgHandleTime: `00:${String(Math.floor(Math.random() * 15) + 5).padStart(
      2,
      "0"
    )}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
    failed: Math.floor(Math.random() * 25),
  }));
};

const AdminArchive = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Controls which row's action panel is open
  const [activeAction, setActiveAction] = useState<string | null>(null);

  // Controls visibility of Add form
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const loadSupervisors = async () => {
      setIsLoading(true);

      try {
        // Uncomment when API is ready:
        // const res = await fetch(`/api/admin/supervisors?...`);
        // if (res.ok) setSupervisors(await res.json());
        throw new Error("API not ready");
      } catch {
        console.warn("API not available → using mock data");
        setSupervisors(generateRandomSupervisors(12));
      }

      setIsLoading(false);
    };

    loadSupervisors();
  }, [selectedType, searchTerm, selectedDate]);

  const getColor = (value: number) => {
    if (value < 40) return "text-red-600";
    if (value < 70) return "text-amber-500";
    return "text-teal-600";
  };

  const toggleAction = (key: string) => {
    setActiveAction(activeAction === key ? null : key);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div
      className="bg-linear-to-br from-teal-50 to-cyan-50 min-h-screen p-4 sm:p-6 md:p-8 lg:p-12"
      dir="ltr"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-extralight text-transparent bg-clip-text bg-linear-to-r from-teal-700 to-teal-500 mb-4">
            Admin Dashboard
          </h1>
          <p className="text-xl text-teal-700 font-medium">
            Supervisors Management & Performance
          </p>
        </header>

        {/* Filters + Add Button */}
        <div className="mb-12">
          <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 shadow-lg border border-teal-100">
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-stretch lg:items-center justify-between">
              {/* Date */}
              <div className="relative flex-1 lg:flex-initial min-w-55">
                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-teal-600 w-5 h-5 pointer-events-none " />

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3.5 rounded-2xl
      border border-teal-200 bg-white/90
      focus:outline-none focus:ring-4 focus:ring-teal-300 text-teal-800
     [&::-webkit-calendar-picker-indicator]:opacity-0
      [&::-webkit-calendar-picker-indicator]:cursor-pointer
      hover:border-teal-300 transition-colors`}
                  placeholder="Choose date..."
                />
              </div>

              {/* Type */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-6 py-4 rounded-2xl bg-white/90 border border-teal-200 shadow-sm text-teal-800 font-medium focus:outline-none focus:ring-4 focus:ring-teal-300 transition-all min-w-45"
              >
                <option value="all">All Types</option>
                <option value="voice">Voice</option>
                <option value="chat">Chat</option>
              </select>

              {/* Search */}
              <div className="relative flex-1 min-w-62.5">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-teal-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search supervisors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 rounded-2xl border border-teal-200 bg-white/90 focus:outline-none focus:ring-4 focus:ring-teal-300 transition-all text-lg"
                />
              </div>

              {/* Add Button */}
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-8 py-4 bg-teal-600 text-white rounded-2xl font-medium hover:bg-teal-700 transition-all shadow-md whitespace-nowrap w-full sm:w-auto"
              >
                {showAddForm ? "Hide Form" : "+ Add Supervisor"}
              </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
              <div className="mt-8 p-6 bg-white rounded-2xl border border-teal-100">
                <h3 className="text-xl font-semibold text-teal-800 mb-6">
                  Add New Supervisor
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-xl border border-teal-200"
                      placeholder="Enter name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      className="w-full px-4 py-3 rounded-xl border border-teal-200"
                      placeholder="+20xxxxxxxxx"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type
                    </label>
                    <select className="w-full px-4 py-3 rounded-xl border border-teal-200">
                      <option value="">Select type</option>
                      <option value="Voice">Voice</option>
                      <option value="Chat">Chat</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        alert(
                          "Supervisor added (simulation - no real API yet)"
                        );
                        setShowAddForm(false);
                      }}
                      className="px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700"
                    >
                      Add Supervisor
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="backdrop-blur-md bg-white/80 rounded-3xl p-6 md:p-10 shadow-xl border border-teal-100">
          <h2 className="text-2xl font-semibold text-teal-800 mb-8 text-center">
            Active Supervisors
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b-2 border-teal-200">
                <tr>
                  <th className="py-4 px-6 font-semibold text-teal-800">
                    Supervisor Name
                  </th>
                  <th className="py-4 px-6 font-semibold text-teal-800">
                    Type
                  </th>
                  <th className="py-4 px-6 font-semibold text-teal-800">
                    Total Interventions
                  </th>
                  <th className="py-4 px-6 font-semibold text-teal-800">
                    Performance
                  </th>
                  <th className="py-4 px-6 font-semibold text-teal-800">
                    Avg. Handle Time
                  </th>
                  <th className="py-4 px-6 font-semibold text-teal-800">
                    Failed
                  </th>
                  <th className="py-4 px-6 font-semibold text-teal-800">
                    Options
                  </th>
                </tr>
              </thead>
              <tbody>
                {supervisors.map((sup) => (
                  <React.Fragment key={sup.name}>
                    <tr className="border-b border-teal-100 hover:bg-teal-50/50 transition-colors">
                      <td className="py-4 px-6 font-medium">{sup.name}</td>
                      <td className="py-4 px-6">{sup.type}</td>
                      <td className="py-4 px-6">{sup.totalInterventions}</td>
                      <td
                        className={`py-4 px-6 font-bold ${getColor(
                          sup.performance
                        )}`}
                      >
                        {sup.performance}%
                      </td>
                      <td className="py-4 px-6">{sup.avgHandleTime}</td>
                      <td className="py-4 px-6 text-red-600">{sup.failed}</td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <button
                          onClick={() => toggleAction(`${sup.name}-info`)}
                          className="text-gray-600 hover:text-gray-900 mr-4"
                        >
                          Info
                        </button>
                        <button
                          onClick={() => toggleAction(`${sup.name}-edit`)}
                          className="text-teal-600 hover:text-teal-800 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleAction(`${sup.name}-delete`)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>

                    {/* Inline action panels */}
                    {activeAction === `${sup.name}-info` && (
                      <tr>
                        <td colSpan={7} className="bg-gray-50 p-6">
                          <div className="text-sm">
                            <strong>Info (simulation):</strong>
                            <br />• Name: {sup.name}
                            <br />• Type: {sup.type}
                            <br />• Total Interventions:{" "}
                            {sup.totalInterventions}
                            <br />• Performance: {sup.performance}%<br />• Avg
                            Handle Time: {sup.avgHandleTime}
                          </div>
                        </td>
                      </tr>
                    )}

                    {activeAction === `${sup.name}-edit` && (
                      <tr>
                        <td colSpan={7} className="bg-amber-50 p-6">
                          <div className="text-sm">
                            <strong>Edit (simulation):</strong>
                            <br />
                            Here you would edit the supervisor data.
                            <br />
                            <br />
                            <button
                              onClick={() => {
                                alert("Changes saved (simulation)");
                                setActiveAction(null);
                              }}
                              className="mt-3 px-5 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
                            >
                              Save Changes
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {activeAction === `${sup.name}-delete` && (
                      <tr>
                        <td colSpan={7} className="bg-red-50 p-6">
                          <div className="text-sm">
                            <strong>Confirm Deletion</strong>
                            <br />
                            Are you sure you want to delete{" "}
                            <strong>{sup.name}</strong>?<br />
                            This cannot be undone.
                            <br />
                            <br />
                            <div className="flex gap-4 mt-3">
                              <button
                                onClick={() => {
                                  alert(`Deleted ${sup.name} (simulation)`);
                                  setActiveAction(null);
                                }}
                                className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                Yes, Delete
                              </button>
                              <button
                                onClick={() => setActiveAction(null)}
                                className="px-6 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminArchive;