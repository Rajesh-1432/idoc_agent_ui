import { useEffect, useState } from 'react';

const SupportAgent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showReprocessPrompt, setShowReprocessPrompt] = useState(false);
  const [endConversation, setEndConversation] = useState(false);
  const [thanksMsg, setThanksMsg] = useState(false);
  const [idocTableData, setIdocTableData] = useState([]);
  const [updatedIdocTableData, setUpdatedIdocTableData] = useState([]);
  const [idocSuccessCount, setIdocSuccessCount] = useState(0);
  const [idocFailureCount, setIdocFailureCount] = useState(0);
  const [syncResults, setSyncResults] = useState([]);
  const [noDataFound, setNoDataFound] = useState(false);

  // Helper function to clean MongoDB data and remove _id fields
  const cleanMongoData = (data) => {
    if (!data) return data;

    if (Array.isArray(data)) {
      return data.map(item => cleanMongoData(item));
    }

    if (typeof data === 'object' && data !== null) {
      const cleaned = {};
      for (const [key, value] of Object.entries(data)) {
        if (key === '_id') {
          continue;
        } else if (typeof value === 'object' && value !== null) {
          cleaned[key] = cleanMongoData(value);
        } else {
          cleaned[key] = value;
        }
      }
      return cleaned;
    }

    return data;
  };

  const fetchIdocIssues = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/idoc-issues`);
      const data = await response.json();
      console.log(data.failed_records);

      const cleanedData = cleanMongoData(data.failed_records);
      setIdocTableData(cleanedData);

      const successCount = parseInt(data.success_count, 10) || 0;
      const failureCount = parseInt(data.failure_count, 10) || 0;
      setIdocSuccessCount(successCount);
      setIdocFailureCount(failureCount);

      if (!cleanedData || cleanedData.length === 0) {
        setNoDataFound(true);
      }
    } catch (error) {
      console.error('Error fetching IDOC table data:', error);
      setNoDataFound(true);
    }
  };

  const fetchIdocData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/idoc-data`);
      const data = await response.json();
      console.log('idoc-data raw response:', data);

      // Handle both array response and object with a records key
      let records = data;
      if (!Array.isArray(data)) {
        // Try common wrapper keys
        records =
          data.records ||
          data.data ||
          data.updated_records ||
          data.idoc_data ||
          data.results ||
          null;

        if (!records) {
          console.warn('Could not find array in /api/idoc-data response. Keys:', Object.keys(data));
          records = [];
        }
      }

      const cleanedData = cleanMongoData(records);
      console.log('idoc-data cleaned:', cleanedData);
      setUpdatedIdocTableData(cleanedData);
    } catch (error) {
      console.error('Error fetching updated IDOC data:', error);
    }
  };

  useEffect(() => {
    fetchIdocIssues();
    handleSend();
  }, []);

  const updateIdoc = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/idoc-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setSyncResults(data.results);
      await fetchIdocData();   // await so state is set before render
    } catch (error) {
      console.error('Error updating IDOC data:', error);
    }
  };

  // Each section's loading and visibility state
  const [loadingStates, setLoadingStates] = useState({
    mainCategoryNLP: { visible: false, loading: false },
    mlSubCategory: { visible: false, loading: false },
    nlpSubCategory: { visible: false, loading: false },
    response: { visible: false, loading: false }
  });

  // Static mock metadata (NOT the table data — that comes from live state)
  const mockResponseMeta = {
    mainCategoryNLP: {
      title: "Categorization",
      runningMessage: "Running: main_nlp_triage_agent_predict_tool(issue_description=psdata idoc sales order issues)",
      result: "NLP Predicted Main Category: Idoc Issue"
    },
    mlSubCategory: {
      title: "Action",
      runningMessage: "Running: ml_triage_agent_predict_tool(incident_description=['psdata idoc sales order issues'])",
      result: "ML Sub Category ML Triage Result: Incorrect Entry"
    },
    nlpSubCategory: {
      title: "NLP Sub Category NLP Triage Result",
      runningMessage: "Running: nlp_triage_agent_predict_tool(issue_description=psdata idoc sales order issues)",
      result: "NLP Sub Category NLP Triage Result: Application Document Not Posted"
    },
    finalResponse: {
      idocAgentTitle: "IDOC Incorrect Entry Agent Result",
      masterDataTitle: "Master Data Table: idoc_status",
      syncTitle: "Running:",
      syncCommand: "sync_idoc_with_sales(user_input=psdata idoc sales order issues)",
      updatedTableTitle: "Updated Master Data Table: idoc_status",
    },
    errorResponse: {
      message: "Your query is not related to IDOC issues. Please provide a query related to IDOC problems for proper assistance."
    }
  };

  // Response data state
  const [responseData, setResponseData] = useState({});

  const handleSend = () => {
    setIsLoading(true);
    setShowReprocessPrompt(false);
    setEndConversation(false);
    setThanksMsg(false);
    startSequentialLoading();
  };

  const handleReprocessResponse = (choice) => {
    if (choice === 'yes') {
      updateIdoc();
      setShowReprocessPrompt(false);
      setEndConversation(true);
    } else {
      setShowReprocessPrompt(false);
      setEndConversation(false);
      setThanksMsg(true);
    }
  };

  const startSequentialLoading = () => {
    if (noDataFound) {
      setIsLoading(false);
      setThanksMsg(true);
      return;
    }

    setLoadingStates({
      mainCategoryNLP: { visible: false, loading: false },
      mlSubCategory: { visible: false, loading: false },
      nlpSubCategory: { visible: false, loading: false },
      response: { visible: false, loading: false }
    });

    const timeout = 2500;
    const headingDelay = 900;
    const sequence = ['mainCategoryNLP', 'mlSubCategory', 'nlpSubCategory', 'response'];

    const executeSequence = (index) => {
      if (index >= sequence.length) {
        setIsLoading(false);
        return;
      }

      const currentItem = sequence[index];
      const nextItem = sequence[index + 1];

      setLoadingStates(prev => ({
        ...prev,
        [currentItem]: { visible: true, loading: true }
      }));

      setTimeout(() => {
        setResponseData(prev => ({
          ...prev,
          [currentItem]: mockResponseMeta[currentItem]
        }));

        setLoadingStates(prev => ({
          ...prev,
          [currentItem]: { visible: true, loading: false }
        }));

        if (nextItem) {
          setTimeout(() => {
            executeSequence(index + 1);
          }, headingDelay);
        } else {
          setIsLoading(false);
          // Save only static metadata — NOT table data (use live state instead)
          setResponseData(prev => ({
            ...prev,
            finalResponse: mockResponseMeta.finalResponse
          }));
          if (!noDataFound) {
            setShowReprocessPrompt(true);
          }
        }
      }, timeout);
    };

    setTimeout(() => {
      executeSequence(0);
    }, 500);
  };

  const getLoadingMessage = (section) => {
    const messages = {
      mainCategoryNLP: mockResponseMeta.mainCategoryNLP.runningMessage,
      mlSubCategory: mockResponseMeta.mlSubCategory.runningMessage,
      nlpSubCategory: mockResponseMeta.nlpSubCategory.runningMessage,
      response: "Generating response..."
    };
    return messages[section] || `Loading ${section}...`;
  };

  const LeftComponents = () => {
    return (
      <div className="flex flex-col h-full p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b border-gray-200 pb-3">Processing Steps</h1>

        <div className="flex flex-col space-y-6 flex-1">
          {loadingStates.mainCategoryNLP.visible && (
            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-indigo-500">
              <h2 className="text-lg font-semibold mb-3 text-gray-800">{mockResponseMeta.mainCategoryNLP.title}</h2>
              {loadingStates.mainCategoryNLP.loading ? (
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin"></div>
                  <p className="text-sm text-gray-600">{getLoadingMessage('mainCategoryNLP')}</p>
                </div>
              ) : responseData.mainCategoryNLP ? (
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm text-gray-700">{responseData.mainCategoryNLP.result}</p>
                </div>
              ) : null}
            </div>
          )}

          {loadingStates.mlSubCategory.visible && (
            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-green-500">
              <h2 className="text-lg font-semibold mb-3 text-gray-800">{mockResponseMeta.mlSubCategory.title}</h2>
              {loadingStates.mlSubCategory.loading ? (
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
                  <p className="text-sm text-gray-600">{getLoadingMessage('mlSubCategory')}</p>
                </div>
              ) : responseData.mlSubCategory ? (
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm text-gray-700">{responseData.mlSubCategory.result}</p>
                </div>
              ) : null}
            </div>
          )}

          {loadingStates.nlpSubCategory.visible && (
            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-purple-500">
              <h2 className="text-lg font-semibold mb-3 text-gray-800">{mockResponseMeta.nlpSubCategory.title}</h2>
              {loadingStates.nlpSubCategory.loading ? (
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin"></div>
                  <p className="text-sm text-gray-600">{getLoadingMessage('nlpSubCategory')}</p>
                </div>
              ) : responseData.nlpSubCategory ? (
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm text-gray-700">{responseData.nlpSubCategory.result}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    );
  };

  const ResponsiveTable = ({ data, title }) => {
    const firstRow = Array.isArray(data) && data.find(row => row && typeof row === 'object');

    if (!data || !Array.isArray(data) || data.length === 0 || !firstRow) {
      return (
        <div className="mb-6">
          {title && <h3 className="font-bold text-lg mb-2">{title}</h3>}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">No data available</p>
          </div>
        </div>
      );
    }

    const getOrderedColumns = (dataRow) => {
      const allKeys = Object.keys(dataRow);
      const idocKey =
        allKeys.find(key => key.toLowerCase().includes('idoc') && key.toLowerCase().includes('number')) ||
        allKeys.find(key => key.toLowerCase().includes('idoc_number')) ||
        allKeys.find(key => key.toLowerCase().includes('idocnumber')) ||
        allKeys.find(key => key.toLowerCase() === 'idoc');

      if (idocKey) {
        return [idocKey, ...allKeys.filter(key => key !== idocKey)];
      }
      return allKeys;
    };

    const orderedColumns = getOrderedColumns(firstRow);

    return (
      <div className="mb-6">
        {title && <h3 className="font-bold text-lg mb-3 text-gray-800">{title}</h3>}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {orderedColumns.map((header, idx) => (
                    <th key={idx} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {header.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.filter(row => row && typeof row === 'object').map((row, rowIdx) => (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {orderedColumns.map((columnKey, cellIdx) => (
                      <td key={cellIdx} className={`px-4 py-3 text-sm text-gray-700 ${cellIdx === 0 && columnKey.toLowerCase().includes('idoc') ? 'font-semibold' : ''}`}>
                        {typeof row[columnKey] === 'object' && row[columnKey] !== null
                          ? JSON.stringify(row[columnKey])
                          : String(row[columnKey] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const SyncResultsComponent = ({ syncResults }) => {
    if (!Array.isArray(syncResults) || syncResults.length === 0) {
      return (
        <div className="mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">No sync results available yet.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-6">
        <div className="space-y-4">
          <p className="font-medium text-gray-800">The following mismatches were found between the IDOC data and the sales data, and they have been updated:</p>
          {syncResults.map((result, idx) => (
            <div key={idx} className="pl-4 border-l-2 border-indigo-400 bg-indigo-50 p-3 rounded-r">
              <p className="font-bold text-gray-800">{idx + 1}. IDOC Number: {result.idocNumber}</p>
              <ul className="pl-4 mt-2 space-y-1">
                {Array.isArray(result.updates) && result.updates.map((update, updateIdx) => (
                  <li key={updateIdx} className="text-sm">
                    <span className="font-medium">{update.field}</span>:
                    <span className="ml-1 bg-gray-100 px-1 rounded">{update.value}</span>
                    {update.status === "updated" ?
                      <span className="text-amber-600 ml-1">(was updated to match from <span className="bg-gray-100 px-1 rounded">{update.oldValue}</span>)</span> :
                      <span className="text-green-600 ml-1">(matched)</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-green-700 font-medium bg-green-50 p-3 rounded border border-green-200">These discrepancies have been successfully reconciled to ensure data consistency between the IDOC and sales records.</p>
        </div>
      </div>
    );
  };

  const safeSuccess = Number(idocSuccessCount) || 0;
  const safeFailure = Number(idocFailureCount) || 0;

  const CountCards = () => {
    return (
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Yearly IDOC Proccess</p>
                  <p className="text-2xl font-bold text-blue-600">{1500 + safeSuccess + safeFailure}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly IDOC Proccess</p>
                  <p className="text-2xl font-bold text-amber-400">{500 + safeSuccess + safeFailure}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Success as Today</p>
                  <p className="text-2xl font-bold text-green-600">{300 + safeSuccess}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Error as Today</p>
                  <p className="text-2xl font-bold text-red-600">{safeFailure}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <CountCards />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        {!noDataFound && Object.values(loadingStates).some(state => state.visible) && (
          <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0">
            <div className="h-full overflow-y-auto">
              <LeftComponents />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          <div className="h-full overflow-y-auto">
            <div className="p-6 max-w-none">

              {/* No Data Found */}
              {noDataFound && (
                <div className="max-w-4xl mx-auto">
                  <div className="flex flex-col bg-green-50 border border-green-200 p-8 rounded-lg shadow-sm items-center space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="text-green-500 text-3xl">✅</div>
                      <div>
                        <h3 className="text-2xl font-semibold text-green-800">No IDOC Issues Found</h3>
                        <p className="text-green-700 mt-1">All IDOC processes are running smoothly</p>
                      </div>
                    </div>
                    <div className="bg-white px-8 py-6 rounded-lg shadow-md w-full max-w-md">
                      <div className="flex justify-around items-center space-x-6">
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-600">Success</p>
                          <p className="text-3xl font-bold text-green-600 mt-1">{safeSuccess}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-600">Errors</p>
                          <p className="text-3xl font-bold text-red-500 mt-1">{safeFailure}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Thanks Message */}
              {thanksMsg && (
                <div className="max-w-4xl mx-auto mb-6">
                  <div className="bg-indigo-50 border border-indigo-200 p-8 rounded-lg shadow-sm">
                    <div className="flex items-center space-x-4">
                      <div className="text-indigo-500 text-3xl">🙏</div>
                      <div>
                        <h3 className="text-2xl font-semibold text-indigo-800">Thank you for choosing SAP Support!</h3>
                        <p className="text-indigo-700 mt-2">We're glad we could help you with your IDOC inquiry.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Response Content */}
              {loadingStates.response.visible && (
                <div className="w-full">
                  {loadingStates.response.loading ? (
                    <div className="max-w-4xl mx-auto">
                      <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
                        <div className="flex items-center space-x-3">
                          <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin"></div>
                          <p className="text-gray-600">{getLoadingMessage('response')}</p>
                        </div>
                      </div>
                    </div>
                  ) : responseData.finalResponse && !noDataFound ? (
                    <div className="w-full">
                      <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b border-gray-200 pb-3">
                          {responseData.finalResponse.idocAgentTitle}
                        </h2>

                        {/* ✅ FIX: Use live state idocTableData, NOT responseData.finalResponse.idocTableData */}
                        <ResponsiveTable
                          data={idocTableData}
                          title={responseData.finalResponse.masterDataTitle}
                        />

                        <div className="mb-6">
                          <p className="font-semibold mb-2 text-gray-800">{responseData.finalResponse.syncTitle}</p>
                          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                            {responseData.finalResponse.syncCommand}
                          </div>
                        </div>

                        {/* Reprocess Prompt */}
                        {showReprocessPrompt && (
                          <div className="mt-6 bg-indigo-50 p-6 rounded-lg border border-indigo-200">
                            <p className="font-bold text-indigo-800 mb-4 text-lg">DO YOU WANT TO REPROCESS?</p>
                            <div className="flex space-x-4">
                              <button
                                onClick={() => handleReprocessResponse('yes')}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors font-medium"
                              >
                                YES
                              </button>
                              <button
                                onClick={() => handleReprocessResponse('no')}
                                className="bg-gray-500 text-white px-6 py-3 rounded-md hover:bg-gray-600 transition-colors font-medium"
                              >
                                NO
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Sync Results and Updated Table */}
                        {endConversation && (
                          <div className="mt-6 border-t border-gray-200 pt-6">
                            <SyncResultsComponent syncResults={syncResults} />

                            {/* ✅ FIX: Use live state updatedIdocTableData, NOT a stale snapshot */}
                            <ResponsiveTable
                              data={updatedIdocTableData}
                              title={responseData.finalResponse.updatedTableTitle}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Initial Loading */}
              {isLoading && !Object.values(loadingStates).some(state => state.visible) && (
                <div className="max-w-4xl mx-auto">
                  <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportAgent;