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

  // Helper function to clean MongoDB data
  const cleanMongoData = (data) => {
    if (!data) return data;

    if (Array.isArray(data)) {
      return data.map(item => cleanMongoData(item));
    }

    if (typeof data === 'object' && data !== null) {
      const cleaned = {};
      for (const [key, value] of Object.entries(data)) {
        if (key === '_id' && value && typeof value === 'object' && value.$oid) {
          // Convert MongoDB ObjectId to string
          cleaned[key] = value.$oid;
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/idoc-issues`);
      const data = await response.json();
      console.log(data.failed_records);

      const cleanedData = cleanMongoData(data.failed_records);
      setIdocTableData(cleanedData);
      setIdocSuccessCount(data.success_count);
      setIdocFailureCount(data.failure_count);

      // Check if there's no failure data
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/idoc-data`);
      const data = await response.json();
      console.log(data);

      const cleanedData = cleanMongoData(data);
      setUpdatedIdocTableData(cleanedData);
    } catch (error) {
      console.error('Error fetching IDOC table data:', error);
    }
  };

  useEffect(() => {
    fetchIdocIssues();
    handleSend();
  }, []);

  const updateIdoc = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/idoc-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setSyncResults(data.results);
      fetchIdocData();
    } catch (error) {
      console.error('Error fetching IDOC table data:', error);
    }
  }

  // Each section's loading and visibility state
  const [loadingStates, setLoadingStates] = useState({
    mainCategoryML: { visible: true, loading: false },
    mainCategoryNLP: { visible: false, loading: false },
    previousTicket: { visible: false, loading: false },
    mlSubCategory: { visible: false, loading: false },
    nlpSubCategory: { visible: false, loading: false },
    response: { visible: false, loading: false }
  });

  // Mock response data for the IDOC issue
  const mockResponseData = {
    mainCategoryML: {
      title: "Main Category: Analysis",
      runningMessage: "Running: main_ml_triage_agent_predict_tool(incident_description=['psdata idoc sales order issues'])",
      result: "ML Predicted Main Category: Idoc Issue"
    },
    mainCategoryNLP: {
      title: "Categeorization",
      runningMessage: "Running: main_nlp_triage_agent_predict_tool(issue_description=psdata idoc sales order issues)",
      result: "NLP Predicted Main Category: Idoc Issue"
    },
    previousTicket: {
      title: "Previous Ticket Analysis",
      runningMessage: "Running: ticket_analysis_rag_agent(query=psdata idoc sales order issues)",
      incidents: [
        {
          incidentNumber: "Not specified",
          errorMessage: "Purchase order still contains faulty items",
          sapDetails: {
            sapId: "MEPO",
            sapModule: "Addon",
            systemClient: "SP1CLNT1/100"
          }
        },
        {
          incidentNumber: "Not specified",
          errorMessage: "Status \"Obsolete\" of material 5002858 does not allow external procurement",
          sapDetails: {
            sapId: "ME",
            sapModule: "Addon",
            systemClient: "SP1CLNT1/100"
          }
        },
        {
          incidentNumber: "Not specified",
          errorMessage: "Tax jurisdiction code not allowed for tax calculation schema TAXUSJ",
          sapDetails: {
            sapId: "06",
            sapModule: "Addon",
            systemClient: "SP1CLNT1/100"
          }
        }
      ],
      analysis: [
        "Faulty Items: Ensure that all items in the purchase order are valid and correctly entered. This may include checking for entry errors or missing data.",
        "Material Status: Verify that the status of the material allows for external procurement. If a material is marked as \"Obsolete\", it might need to be updated or replaced with a valid material.",
        "Tax Jurisdiction: Validate the tax jurisdiction code setup in the system to ensure compliance with the tax calculation schema being used.",
        "General Troubleshooting: Always verify the related configurations in SAP for each identified module (e.g., Addon). Make sure the module and screen settings align with the operational requirements of the sales order."
      ],
      conclusion: "These tickets suggest cross-verifying the current setup and data accuracy for IDOCs related to sales orders, focusing on areas like data entry and configuration settings for procurement and taxation."
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
      idocTableData: idocTableData,
      syncTitle: "Running:",
      syncCommand: "sync_idoc_with_sales(user_input=psdata idoc sales order issues)",
      syncResults: syncResults,
      updatedTableTitle: "Updated Master Data Table: idoc_status",
      updatedIdocTableData: updatedIdocTableData
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

  // Handle reprocess buttons
  const handleReprocessResponse = (choice) => {
    if (choice === 'yes') {
      // Show updated table and end conversation
      updateIdoc();
      setShowReprocessPrompt(false);
      setEndConversation(true);
    } else {
      // Just end conversation with thanks
      setShowReprocessPrompt(false);
      setEndConversation(false);
      setThanksMsg(true);
    }
  };

  const startSequentialLoading = () => {
    // If no data found, skip to thanks message
    if (noDataFound) {
      setIsLoading(false);
      setThanksMsg(true);
      return;
    }

    // Reset all loading states and visibility
    setLoadingStates({
      mainCategoryML: { visible: false, loading: false },
      mainCategoryNLP: { visible: false, loading: false },
      previousTicket: { visible: false, loading: false },
      mlSubCategory: { visible: false, loading: false },
      nlpSubCategory: { visible: false, loading: false },
      response: { visible: false, loading: false }
    });

    const timeout = 2500;  // Base timeout for each section
    const headingDelay = 900;  // Delay before showing next heading

    // Sequential order of components
    const sequence = ['mainCategoryML', 'mainCategoryNLP', 'previousTicket', 'mlSubCategory', 'nlpSubCategory', 'response'];

    // First make mainCategoryML heading visible
    setTimeout(() => {
      setLoadingStates(prev => ({
        ...prev,
        mainCategoryML: { visible: true, loading: true }
      }));

      // Execute the sequence
      executeSequence(0);
    }, 500);

    // Function to execute the sequence of components
    const executeSequence = (index) => {
      if (index >= sequence.length) {
        setIsLoading(false);
        return;
      }

      const currentItem = sequence[index];
      const nextItem = sequence[index + 1];

      // Process current item content
      setTimeout(() => {
        // Update the content of the current item
        setResponseData(prev => ({
          ...prev,
          [currentItem]: mockResponseData[currentItem]
        }));

        // Mark current item as loaded
        setLoadingStates(prev => ({
          ...prev,
          [currentItem]: { visible: true, loading: false }
        }));

        // Make next item visible if there is one
        if (nextItem) {
          setTimeout(() => {
            setLoadingStates(prev => ({
              ...prev,
              [nextItem]: { visible: true, loading: true }
            }));

            // Process next item
            executeSequence(index + 1);
          }, headingDelay);
        } else {
          setIsLoading(false);
          // Set final response
          setResponseData(prev => ({
            ...prev,
            finalResponse: mockResponseData.finalResponse
          }));
          // Show reprocess prompt only if data exists
          if (!noDataFound) {
            setShowReprocessPrompt(true);
          }
        }
      }, timeout);
    };
  };

  // Get loading messages for each section
  const getLoadingMessage = (section) => {
    const messages = {
      mainCategoryML: mockResponseData.mainCategoryML.runningMessage,
      mainCategoryNLP: mockResponseData.mainCategoryNLP.runningMessage,
      previousTicket: mockResponseData.previousTicket.runningMessage,
      mlSubCategory: mockResponseData.mlSubCategory.runningMessage,
      nlpSubCategory: mockResponseData.nlpSubCategory.runningMessage,
      response: "Generating response..."
    };
    return messages[section] || `Loading ${section}...`;
  };

  // Left panel components (ML categories)
  const LeftComponents = () => {
    return (
      <div className="flex flex-col h-full">
        <div className="flex flex-col h-full space-y-6">
          {/* Main Category ML Section */}
          {loadingStates.mainCategoryML.visible && (
            <div className="flex-1 min-h-0 overflow-auto">
              <h2 className="text-xl font-bold mb-4 sticky top-0 bg-white z-10 py-2">{mockResponseData.mainCategoryML.title}</h2>
              {loadingStates.mainCategoryML.loading ? (
                <div className="bg-gray-100 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-500">{getLoadingMessage('mainCategoryML')}</p>
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin"></div>
                  </div>
                </div>
              ) : responseData.mainCategoryML ? (
                <div className="bg-white px-6 py-4 rounded-2xl shadow-md w-full max-w-sm flex justify-around items-center space-x-4">
                  <div className="text-center">
                    <p className="text-lg font-medium text-gray-700">Total Success</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{idocSuccessCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium text-gray-700">Total Error</p>
                    <p className="text-3xl font-bold text-red-500 mt-1">{idocFailureCount}</p>
                  </div>
                </div>

              ) : (
                <div className="bg-gray-100 p-4 rounded-lg animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                </div>
              )}
            </div>
          )}

          {/* Main Category NLP Section */}
          {loadingStates.mainCategoryNLP.visible && (
            <div className="flex-1 min-h-0 overflow-auto">
              <h2 className="text-xl font-bold mb-4 sticky top-0 bg-white z-10 py-2">{mockResponseData.mainCategoryNLP.title}</h2>
              {loadingStates.mainCategoryNLP.loading ? (
                <div className="bg-gray-100 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-500">{getLoadingMessage('mainCategoryNLP')}</p>
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin"></div>
                  </div>
                </div>
              ) : responseData.mainCategoryNLP ? (
                <div className="bg-gray-100 p-4 rounded-lg">
                  <p>{responseData.mainCategoryNLP.result}</p>
                </div>
              ) : (
                <div className="bg-gray-100 p-4 rounded-lg animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                </div>
              )}
            </div>
          )}

          {/* ML Sub Category Section */}
          {loadingStates.mlSubCategory.visible && (
            <div className="flex-1 min-h-0 overflow-auto">
              <h2 className="text-xl font-bold mb-4 sticky top-0 bg-white z-10 py-2">{mockResponseData.mlSubCategory.title}</h2>
              {loadingStates.mlSubCategory.loading ? (
                <div className="bg-gray-100 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-500">{getLoadingMessage('mlSubCategory')}</p>
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin"></div>
                  </div>
                </div>
              ) : responseData.mlSubCategory ? (
                <div className="bg-gray-100 p-4 rounded-lg">
                  <p>{responseData.mlSubCategory.result}</p>
                </div>
              ) : (
                <div className="bg-gray-100 p-4 rounded-lg animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Right panel components (NLP categories and previous tickets)
  const RightComponents = () => {
    return (
      <div className="flex flex-col h-full">
        <div className="flex flex-col h-full space-y-6">
          {/* Previous Ticket Analysis Section */}
          {loadingStates.previousTicket.visible && (
            <div className="flex-1 min-h-0 overflow-auto">
              <h2 className="text-xl font-bold mb-4 sticky top-0 bg-white z-10 py-2">{mockResponseData.previousTicket.title}</h2>
              {loadingStates.previousTicket.loading ? (
                <div className="bg-gray-100 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-500">{getLoadingMessage('previousTicket')}</p>
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin"></div>
                  </div>
                </div>
              ) : responseData.previousTicket ? (
                <div className="bg-gray-100 p-4 rounded-lg">
                  {responseData.previousTicket.incidents.map((incident, idx) => (
                    <div key={idx} className="mb-4 pb-3 border-b border-gray-200">
                      <p className="font-semibold">Similar Incident Found:</p>
                      <p>Incident Number: {incident.incidentNumber}</p>
                      <p>Error Message: {incident.errorMessage}</p>
                      <p className="font-semibold mt-1">SAP Details:</p>
                      <p>SAP Id: {incident.sapDetails.sapId}</p>
                      <p>SAP Module: {incident.sapDetails.sapModule}</p>
                      <p>System/Client: {incident.sapDetails.systemClient}</p>
                    </div>
                  ))}
                  <div className="mt-4">
                    <p className="font-semibold">Previous Ticket Analysis:</p>
                    {responseData.previousTicket.analysis.map((item, idx) => (
                      <p key={idx} className="mt-2">{item}</p>
                    ))}
                    <p className="mt-3">{responseData.previousTicket.conclusion}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 p-4 rounded-lg animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                </div>
              )}
            </div>
          )}

          {/* NLP Sub Category Section */}
          {loadingStates.nlpSubCategory.visible && (
            <div className="flex-1 min-h-0 overflow-auto">
              <h2 className="text-xl font-bold mb-4 sticky top-0 bg-white z-10 py-2">{mockResponseData.nlpSubCategory.title}</h2>
              {loadingStates.nlpSubCategory.loading ? (
                <div className="bg-gray-100 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-500">{getLoadingMessage('nlpSubCategory')}</p>
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin"></div>
                  </div>
                </div>
              ) : responseData.nlpSubCategory ? (
                <div className="bg-gray-100 p-4 rounded-lg">
                  <p>{responseData.nlpSubCategory.result}</p>
                </div>
              ) : (
                <div className="bg-gray-100 p-4 rounded-lg animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Create responsive table component
  const ResponsiveTable = ({ data, title }) => {
    if (!data || data.length === 0) {
      return (
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-2">{title}</h3>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">No data available</p>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-6 overflow-x-auto">
        <h3 className="font-bold text-lg mb-2">{title}</h3>
        <div className="border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {Object.keys(data[0]).map((header, idx) => (
                  <th key={idx} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {header.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row, rowIdx) => (
                <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {Object.values(row).map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-3 py-2 text-xs text-gray-500">
                      {typeof cell === 'object' && cell !== null ? JSON.stringify(cell) : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Sync results component
  const SyncResultsComponent = ({ syncResults }) => {
    return (
      <div className="mb-6">
        <div className="space-y-4">
          <p className="font-medium">The following mismatches were found between the IDOC data and the sales data, and they have been updated:</p>
          {syncResults.map((result, idx) => (
            <div key={idx} className="pl-2 border-l-2 border-indigo-400">
              <p className="font-bold">{idx + 1}. IDOC Number: {result.idocNumber}</p>
              <ul className="pl-4 mt-1 space-y-1">
                {result.updates.map((update, updateIdx) => (
                  <li key={updateIdx} className="text-sm">
                    <span className="font-medium">{update.field}</span>:
                    <span className="ml-1">`{update.value}`</span>
                    {update.status === "updated" ?
                      <span className="text-amber-600 ml-1">(was updated to match from `{update.oldValue}`)</span> :
                      <span className="text-green-600 ml-1">(matched)</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-green-700 font-medium">These discrepancies have been successfully reconciled to ensure data consistency between the IDOC and sales records.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex flex-grow overflow-hidden">
        {/* Left Panel - Only visible after interaction */}
        {!noDataFound && (
          <div className="hidden md:block w-1/4 bg-white border-r border-gray-200 overflow-hidden">
            <div className="p-4 h-full">
              <LeftComponents />
            </div>
          </div>
        )}
        <div className="flex-grow flex flex-col md:w-2/4 overflow-auto">
          <div className="max-w-3xl mx-auto w-full">
            {responseData.query && (
              <div className="mb-6 flex justify-end">
                <div className="bg-indigo-500 text-white p-4 rounded-lg rounded-tr-none max-w-md">
                  <p>{responseData.query}</p>
                </div>
              </div>
            )}

            {/* No Data Found Message */}
            {noDataFound && (
              <div className="m-10">
                <div className="flex flex-col bg-green-50 border border-green-200 p-6 rounded-lg shadow-sm items-center space-y-4 ">
                  <div className="flex items-center space-x-3">
                    <div className="text-green-500 text-2xl">✅</div>
                    <div>
                      <h3 className="text-lg font-semibold text-green-800">No IDOC Issues Found</h3>

                    </div>
                  </div>
                  <div className="bg-white px-6 py-4 rounded-2xl shadow-md w-full max-w-sm flex justify-around items-center space-x-4">
                    <div className="text-center">
                      <p className="text-lg font-medium text-gray-700">Total Success</p>
                      <p className="text-3xl font-bold text-green-600 mt-1">{idocSuccessCount}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-medium text-gray-700">Total Error</p>
                      <p className="text-3xl font-bold text-red-500 mt-1">{idocFailureCount}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Thanks Message */}
            {thanksMsg && (
              <div className="mb-6">
                <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="text-indigo-500 text-2xl">🙏</div>
                    <div>
                      <h3 className="text-lg font-semibold text-indigo-800">Thank you for choosing SAP Support!</h3>
                      <p className="text-indigo-700 mt-1">We're glad we could help you with your IDOC inquiry.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {loadingStates.response.visible ? (
              loadingStates.response.loading ? (
                <div className="mb-6">
                  <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm max-w-full">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-gray-500">{getLoadingMessage('response')}</p>
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin"></div>
                    </div>
                  </div>
                </div>
              ) : responseData.finalResponse && !noDataFound ? (
                <div className="mb-6 overflow-auto ">
                  <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                    {/* New Table Response */}
                    <h2 className="text-xl font-bold mb-3">{responseData.finalResponse.idocAgentTitle}</h2>
                    <h3 className="text-lg font-semibold mb-2">{responseData.finalResponse.masterDataTitle}</h3>

                    {/* IDOC Table */}
                    <ResponsiveTable
                      data={idocTableData}
                      title=""
                    />

                    {/* Running Command */}
                    <p className="font-semibold mb-1">{responseData.finalResponse.syncTitle}</p>
                    <p className="mb-4 font-mono text-sm bg-gray-50 p-2 rounded">{responseData.finalResponse.syncCommand}</p>

                    {/* Reprocess Prompt */}
                    {showReprocessPrompt && (
                      <div className="mt-4 bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                        <p className="font-bold text-indigo-800 mb-3">DO YOU WANT TO REPROCESS?</p>
                        <div className="flex space-x-4">
                          <button
                            onClick={() => handleReprocessResponse('yes')}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                          >
                            YES
                          </button>
                          <button
                            onClick={() => handleReprocessResponse('no')}
                            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                          >
                            NO
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Sync Results and Updated Table */}
                    {endConversation && (
                      <div>
                        <SyncResultsComponent syncResults={syncResults} />
                        <h3 className="text-lg font-semibold mb-2">{responseData.finalResponse.updatedTableTitle}</h3>
                        <ResponsiveTable
                          data={updatedIdocTableData}
                          title=""
                          className="overflow-x-auto"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : null
            ) : isLoading && !Object.values(loadingStates).some(state => state.visible) ? (
              <div className="mb-6">
                <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm max-w-md">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        {!noDataFound && (
          <div className="hidden md:block w-1/4 bg-white border-l border-gray-200 overflow-hidden">
            <div className="p-4 h-full">
              <RightComponents />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default SupportAgent;  