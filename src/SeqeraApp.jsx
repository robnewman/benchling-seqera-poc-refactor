import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2, Rocket } from 'lucide-react';

const SeqeraApp = () => {
  const [pipelines, setPipelines] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runsLoading, setRunsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [runsError, setRunsError] = useState(null);

  const [config, setConfig] = useState({
    seqeraToken: '',
    workspaceId: '',
    seqeraApi: ''
  });

    // ===== ADD THIS: Initialize Benchling SDK =====
  useEffect(() => {
    // Tell Benchling the app is ready
    if (window.benchling && window.benchling.ready) {
      window.benchling.ready();
      console.log('✅ Benchling SDK initialized');
    }
  }, []);
  // ===== END OF NEW CODE =====

  useEffect(() => {
    if (window.benchling) {
      // Benchling environment
      window.benchling.getAppConfig().then(async (appConfig) => {
        console.log('📋 Benchling config received:', appConfig);

        let workspaceId = null;
        if (appConfig.organizationName && appConfig.workspaceName) {
          workspaceId = await resolveWorkspaceId(
            appConfig.seqeraToken,
            appConfig.seqeraApi || 'https://api.cloud.seqera.io',
            appConfig.organizationName,
            appConfig.workspaceName
          );
        }

        setConfig({
          seqeraToken: appConfig.seqeraToken,
          workspaceId: workspaceId,
          seqeraApi: appConfig.seqeraApi || 'https://api.cloud.seqera.io'
        });
      }).catch(err => {
        console.error('❌ Failed to get Benchling config:', err);
        setError('Failed to load configuration from Benchling');
        setLoading(false);
      });
    } else {
      // Non-Benchling environment (like App Runner)
      // Option 1: Use environment variables
      const seqeraToken = process.env.REACT_APP_SEQERA_TOKEN;
      const workspaceId = process.env.REACT_APP_WORKSPACE_ID;
      
      if (seqeraToken && workspaceId) {
        setConfig({
          seqeraToken: seqeraToken,
          workspaceId: workspaceId,
          seqeraApi: 'https://api.cloud.seqera.io'
        });
      } else {
        // Option 2: Show a configuration form
        setError('Please configure your Seqera credentials');
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (config.seqeraToken && config.workspaceId) {
      fetchPipelines();
      fetchRuns();
    }
  }, [config]);

  const resolveWorkspaceId = async (token, apiUrl, orgName, workspaceName) => {
    try {
      const baseUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001/api'
        : '/api';  // Use relative URL to hit your proxy

      const orgsResponse = await fetch(`${baseUrl}/orgs`, {
        headers: {
          'X-Seqera-Token': token,
          'Content-Type': 'application/json',
        },
      });

      if (!orgsResponse.ok) {
        throw new Error(`Failed to fetch organizations: ${orgsResponse.status}`);
      }

      const orgsData = await orgsResponse.json();
      const org = orgsData.organizations?.find(
        o => o.name.toLowerCase() === orgName.toLowerCase()
      );

      if (!org) {
        throw new Error(`Organization "${orgName}" not found`);
      }

      const workspacesResponse = await fetch(
        `${baseUrl}/orgs/${org.orgId}/workspaces`,
        {
          headers: {
            'X-Seqera-Token': token,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!workspacesResponse.ok) {
        throw new Error(`Failed to fetch workspaces: ${workspacesResponse.status}`);
      }

      const workspacesData = await workspacesResponse.json();
      const workspace = workspacesData.workspaces?.find(
        w => w.name.toLowerCase() === workspaceName.toLowerCase()
      );

      if (!workspace) {
        throw new Error(`Workspace "${workspaceName}" not found in organization "${orgName}"`);
      }

      return workspace.id;
    } catch (err) {
      setError(`Failed to resolve workspace: ${err.message}`);
      return null;
    }
  };

  const fetchRuns = async () => {
    try {
      setRunsLoading(true);
      setRunsError(null);

      if (!config.seqeraToken || !config.workspaceId) {
        throw new Error('Missing required configuration.');
      }

      const apiUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:3001/api'
        : '/api';

      const response = await fetch(
        `${apiUrl}/workflow?offset=0&max=25&workspaceId=${config.workspaceId}&attributes=labels,minimal`,
        {
          headers: {
            'X-Seqera-Token': config.seqeraToken,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const runsList = data.workflows || data || [];
      setRuns(runsList);
    } catch (err) {
      setRunsError(err.message);
    } finally {
      setRunsLoading(false);
    }
  };

  const fetchPipelines = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!config.seqeraToken || !config.workspaceId) {
        throw new Error('Missing required configuration.');
      }

      const apiUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:3001/api'
        : '/api';  // Use relative URL to hit your proxy

      const response = await fetch(
        `${apiUrl}/pipelines?workspaceId=${config.workspaceId}`,
        {
          headers: {
            'X-Seqera-Token': config.seqeraToken,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const pipelineList = data.pipelines || data || [];
      setPipelines(pipelineList);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const launchPipeline = (pipeline) => {
    // Redirect to Seqera launch form
    const launchUrl = `https://cloud.seqera.io/orgs/${pipeline.orgName}/workspaces/${pipeline.workspaceName}/launchpad/${pipeline.pipelineId}/form/new-form`;
    window.open(launchUrl, '_blank');
  };

  const relaunchWorkflow = (run) => {
    // Redirect to Seqera relaunch form
    const relaunchUrl = `https://cloud.seqera.io/orgs/${run.workflow?.organizationName || run.organizationName}/workspaces/${run.workflow?.workspaceName || run.workspaceName}/launchpad/launch/new-form?resume=false&workflowId=${run.workflow?.id || run.id}`;
    window.open(relaunchUrl, '_blank');
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = (status) => {
    if (!status) return '—';
    
    const statusLower = status.toLowerCase();
    const isFailed = statusLower === 'failed' || statusLower === 'error';
    const isSucceeded = statusLower === 'succeeded' || statusLower === 'completed';
    const isCancelled = statusLower === 'cancelled' || statusLower === 'canceled';
    
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        border: '1px solid',
        borderColor: isFailed ? '#FCA5A5' : isSucceeded ? '#86EFAC' : isCancelled ? '#D1D5DB' : '#D1D5DB',
        backgroundColor: isFailed ? '#FEF2F2' : isSucceeded ? '#F0FDF4' : isCancelled ? '#F9FAFB' : '#F9FAFB',
        fontSize: '0.875rem'
      }}>
        {isFailed && (
          <AlertCircle style={{ width: '16px', height: '16px', color: '#DC2626' }} />
        )}
        {isSucceeded && (
          <svg style={{ width: '16px', height: '16px', color: '#16A34A' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {isCancelled && (
          <svg style={{ width: '16px', height: '16px', color: '#6B7280' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <span style={{ color: isFailed ? '#DC2626' : isSucceeded ? '#16A34A' : isCancelled ? '#6B7280' : '#374151' }}>
          {statusLower}
        </span>
      </div>
    );
  };

  const getStatusColor = (status) => {
    if (!status) return '#D1D5DB';
    const statusLower = status.toLowerCase();
    if (statusLower === 'failed' || statusLower === 'error') return '#DC2626';
    if (statusLower === 'succeeded' || statusLower === 'completed') return '#16A34A';
    if (statusLower === 'cancelled' || statusLower === 'canceled') return '#D1D5DB';
    return '#D1D5DB';
  };

  const getTimeSince = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'after <1m';
    if (diffMins < 60) return `after ${diffMins}m`;
    if (diffHours < 24) return `after ${diffHours}h`;
    return `after ${diffDays}d`;
  };

  const getIconUrl = (iconUrl) => {
    if (!iconUrl) return null;
    // In localhost, icons won't work due to cookie auth, so return null to show placeholder
    if (window.location.hostname === 'localhost') {
      return null;
    }
    // In production (Benchling), icons should work since same-origin
    return iconUrl;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600">Loading pipelines...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchPipelines}
              className="mt-3 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Seqera Platform Integration
        </h1>
        <p className="text-gray-600 mt-2">
          Connected to workspace • {pipelines.length} pipeline{pipelines.length !== 1 ? 's' : ''} available
        </p>
      </div>

      <div>
        {pipelines.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No pipelines found</p>
          </div>
        ) : (
          <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 pr-4 text-left text-sm font-semibold text-gray-700" colspan="2">
                  Pipeline
                </th>
                <th className="pb-3 pr-4 text-left text-sm font-semibold text-gray-700">
                  Last Updated
                </th>
                <th className="pb-3 text-left text-sm font-semibold text-gray-700">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {pipelines.map((pipeline) => {
                const iconSrc = getIconUrl(pipeline.icon);
                return (
                  <tr key={pipeline.pipelineId} className="pipeline-row">
                    <td className="py-4 pr-4" style={{ width: '60px' }}>
                      <div style={{ width: '40px', height: '40px' }} className="flex items-center justify-center">
                        {iconSrc ? (
                          <>
                            <img 
                              src={iconSrc}
                              alt={pipeline.name}
                              style={{ width: '40px', height: '40px' }}
                              className="object-contain"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const placeholder = e.target.nextElementSibling;
                                if (placeholder) placeholder.style.display = 'flex';
                              }}
                            />
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center" style={{ display: 'none' }}>
                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                          </>
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="font-semibold text-gray-900">
                        {pipeline.name || 'Unnamed Pipeline'}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {pipeline.repository || 'No repository'}
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-gray-700">
                      {pipeline.lastUpdated 
                        ? new Date(pipeline.lastUpdated).toLocaleDateString()
                        : '—'
                      }
                    </td>
                    <td className="py-4">
                      <button
                        onClick={() => launchPipeline(pipeline)}
                        style={{ 
                          padding: '0.5rem 1rem',
                          backgroundColor: '#16A34A',
                          color: 'white',
                          borderRadius: '0.5rem',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#15803D'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#16A34A'}
                      >
                        <Rocket style={{ width: '16px', height: '16px', color: 'white' }} />
                        Launch
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Runs Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Runs</h2>
        
        {runsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-gray-600">Loading runs...</span>
          </div>
        ) : runsError ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{runsError}</p>
                <button
                  onClick={fetchRuns}
                  className="mt-3 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No runs found</p>
          </div>
        ) : (
          <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 pr-4 text-left text-sm font-semibold text-gray-700">
                  Run
                </th>
                <th className="pb-3 pr-4 text-left text-sm font-semibold text-gray-700">
                  Labels
                </th>
                <th className="pb-3 pr-4 text-left text-sm font-semibold text-gray-700">
                  User
                </th>
                <th className="pb-3 pr-4 text-left text-sm font-semibold text-gray-700">
                  Submitted
                </th>
                <th className="pb-3 pr-4 text-left text-sm font-semibold text-gray-700">
                  Status
                </th>
                <th className="pb-3 pr-4 text-left text-sm font-semibold text-gray-700">
                  Starred
                </th>
                <th className="pb-3 text-left text-sm font-semibold text-gray-700">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const status = (run.workflow?.status || run.status || '').toLowerCase();
                const statusClass = status === 'failed' || status === 'error' 
                  ? 'status-failed' 
                  : status === 'succeeded' || status === 'completed'
                    ? 'status-succeeded'
                    : status === 'cancelled' || status === 'canceled'
                      ? 'status-cancelled'
                      : '';
                
                return (
                  <tr key={run.workflow?.id || run.id} className={`run-row ${statusClass}`}>
                    <td className="py-4 pr-4">
                      <div style={{ fontWeight: 'bold', color: '#111827' }}>
                        {run.workflow?.runName || run.runName || 'Unnamed Run'}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '0.25rem' }}>
                        {run.workflow?.projectName || run.projectName || '—'}
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {(run.workflow?.labels || run.labels || [])
                          .filter(label => typeof label === 'string' || label.resource === false)
                          .map((label, idx) => {
                            const labelText = typeof label === 'string' 
                              ? label 
                              : label.value 
                                ? `${label.name}=${label.value}` 
                                : label.name || '';
                            
                            return (
                              <span
                                key={idx}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: '#F3F4F6',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem',
                                  color: '#374151'
                                }}
                              >
                                {labelText}
                              </span>
                            );
                          })}
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#374151' }}>
                        <svg style={{ width: '20px', height: '20px', color: '#6B7280' }} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M7.07,18.28C7.5,17.38 10.12,16.5 12,16.5C13.88,16.5 16.5,17.38 16.93,18.28C15.57,19.36 13.86,20 12,20C10.14,20 8.43,19.36 7.07,18.28M18.36,16.83C16.93,15.09 13.46,14.5 12,14.5C10.54,14.5 7.07,15.09 5.64,16.83C4.62,15.5 4,13.82 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,13.82 19.38,15.5 18.36,16.83M12,6C10.06,6 8.5,7.56 8.5,9.5C8.5,11.44 10.06,13 12,13C13.94,13 15.5,11.44 15.5,9.5C15.5,7.56 13.94,6 12,6M12,11A1.5,1.5 0 0,1 10.5,9.5A1.5,1.5 0 0,1 12,8A1.5,1.5 0 0,1 13.5,9.5A1.5,1.5 0 0,1 12,11Z" />
                        </svg>
                        <span>{run.workflow?.userName || run.userName || '—'}</span>
                      </div>
                    </td>
                    <td className="py-4 pr-4" style={{ color: '#374151' }}>
                      {formatTimestamp(run.workflow?.submit || run.submit)}
                    </td>
                    <td className="py-4 pr-4">
                      {getStatusBadge(run.workflow?.status || run.status)}
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                        {getTimeSince(run.workflow?.submit || run.submit)}
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      {run.workflow?.starred || run.starred ? (
                        <svg style={{ width: '20px', height: '20px', color: '#F97316' }} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ) : (
                        <svg style={{ width: '20px', height: '20px', color: '#D1D5DB' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      )}
                    </td>
                    <td className="py-4">
                      <button
                        onClick={() => relaunchWorkflow(run)}
                        style={{ 
                          padding: '0.5rem 1rem',
                          backgroundColor: '#16A34A',
                          color: 'white',
                          borderRadius: '0.5rem',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#15803D'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#16A34A'}
                      >
                        <Rocket style={{ width: '16px', height: '16px', color: 'white' }} />
                        Relaunch
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SeqeraApp;