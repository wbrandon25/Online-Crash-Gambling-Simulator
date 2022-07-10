import React, { useRef } from 'react'
import './Modal.css'

function Modal(props) {

    const modalRef = useRef()
    const closeModal = e => {
        if (modalRef.current == e.target) {
            props.setTrigger(false)
        }
    }
    return (props.trigger) ? (
        <div className='popup' ref={modalRef} onClick={closeModal}>
            {props.children}
        </div>
    ) : ("")
}

export default Modal